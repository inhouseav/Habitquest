// Hand-rolled Web Push (RFC 8291 payload encryption + VAPID JWT signing),
// using only the Web Crypto API that's built into the Cloudflare Workers
// runtime — no npm package needed.

const te = new TextEncoder();

function b64urlToBytes(str) {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const bin = atob(padded + pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function bytesToB64url(bytes) {
  let bin = "";
  const arr = new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function concatBytes(...parts) {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

async function hmacSha256(keyBytes, dataBytes) {
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, dataBytes);
  return new Uint8Array(sig);
}

/** One-step HKDF (extract-then-expand, single block — fine since we only ever need <= 32 bytes). */
async function hkdf(salt, ikm, info, length) {
  const prk = await hmacSha256(salt, ikm);
  const t1 = await hmacSha256(prk, concatBytes(info, new Uint8Array([1])));
  return t1.slice(0, length);
}

/** Builds the "Authorization: vapid t=..., k=..." header value. */
export async function buildVapidAuth(privateJwk, audience, subject) {
  const header = { typ: "JWT", alg: "ES256" };
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: subject,
  };
  const unsigned =
    bytesToB64url(te.encode(JSON.stringify(header))) + "." + bytesToB64url(te.encode(JSON.stringify(payload)));

  const key = await crypto.subtle.importKey(
    "jwk",
    privateJwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, te.encode(unsigned));
  const jwt = unsigned + "." + bytesToB64url(sig);
  return jwt;
}

/** Encrypts a JSON-able payload per RFC 8291 (aes128gcm). Returns raw bytes ready to POST. */
async function encryptPayload(subscription, plaintextBytes) {
  const uaPublicKeyBytes = b64urlToBytes(subscription.p256dh);
  const authSecret = b64urlToBytes(subscription.auth);

  const uaPublicKey = await crypto.subtle.importKey(
    "raw",
    uaPublicKeyBytes,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  const ephemeral = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const asPublicKeyBytes = new Uint8Array(await crypto.subtle.exportKey("raw", ephemeral.publicKey));

  const sharedSecretBits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: uaPublicKey },
    ephemeral.privateKey,
    256
  );
  const sharedSecret = new Uint8Array(sharedSecretBits);

  const authInfo = concatBytes(te.encode("WebPush: info\0"), uaPublicKeyBytes, asPublicKeyBytes);
  const ikm = await hkdf(authSecret, sharedSecret, authInfo, 32);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cekInfo = te.encode("Content-Encoding: aes128gcm\0");
  const nonceInfo = te.encode("Content-Encoding: nonce\0");
  const cekBytes = await hkdf(salt, ikm, cekInfo, 16);
  const nonceBytes = await hkdf(salt, ikm, nonceInfo, 12);

  const padded = concatBytes(plaintextBytes, new Uint8Array([0x02])); // delimiter, no extra padding needed

  const cek = await crypto.subtle.importKey("raw", cekBytes, { name: "AES-GCM" }, false, ["encrypt"]);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonceBytes, tagLength: 128 }, cek, padded)
  );

  const rsBuf = new Uint8Array(4);
  new DataView(rsBuf.buffer).setUint32(0, ciphertext.length, false);

  const header = concatBytes(salt, rsBuf, new Uint8Array([asPublicKeyBytes.length]), asPublicKeyBytes);
  return concatBytes(header, ciphertext);
}

/**
 * Sends a push notification to one subscription.
 * subscription: { endpoint, p256dh, auth }
 * payload: a plain object (will be JSON-stringified), e.g. { title, body }
 * Returns { ok, status, expired } — expired=true means the subscription is dead and should be deleted.
 */
export async function sendWebPush(subscription, payload, env) {
  const privateJwk = JSON.parse(env.VAPID_PRIVATE_JWK);
  const audience = new URL(subscription.endpoint).origin;
  const jwt = await buildVapidAuth(privateJwk, audience, "mailto:hello@fuelthefun.app");

  const body = await encryptPayload(subscription, te.encode(JSON.stringify(payload)));

  const res = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      Authorization: `vapid t=${jwt}, k=${env.VAPID_PUBLIC_KEY}`,
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: "86400",
    },
    body,
  });

  const expired = res.status === 404 || res.status === 410;
  return { ok: res.ok, status: res.status, expired };
}
