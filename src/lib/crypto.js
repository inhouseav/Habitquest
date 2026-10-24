// Small crypto helpers built on the Web Crypto API (available natively in
// Cloudflare Workers — no npm dependency needed).

function bufToHex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function hexToBuf(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

const PBKDF2_ITERATIONS = 100000;

/**
 * Hashes a family PIN with PBKDF2 + a random salt.
 * Returns a single string: "iterations.saltHex.hashHex" so it's safe to
 * store directly in the families.pin_hash column.
 */
export async function hashPin(pin) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return `${PBKDF2_ITERATIONS}.${bufToHex(salt)}.${bufToHex(bits)}`;
}

/** Verifies a PIN against a stored "iterations.saltHex.hashHex" string. */
export async function verifyPin(pin, stored) {
  if (!stored || typeof stored !== "string") return false;
  const parts = stored.split(".");
  if (parts.length !== 3) return false;
  const [iterationsStr, saltHex, hashHex] = parts;
  const iterations = parseInt(iterationsStr, 10);
  const salt = hexToBuf(saltHex);

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    keyMaterial,
    256
  );
  const computedHex = bufToHex(bits);

  // Constant-time-ish comparison to avoid trivial timing leaks.
  if (computedHex.length !== hashHex.length) return false;
  let diff = 0;
  for (let i = 0; i < computedHex.length; i++) {
    diff |= computedHex.charCodeAt(i) ^ hashHex.charCodeAt(i);
  }
  return diff === 0;
}

export function newId() {
  return crypto.randomUUID();
}

/** A long random session token (not the same as a DB row id, but fine to use as one). */
export function newSessionToken() {
  return `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "");
}

const JOIN_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to avoid confusion
export function newJoinCode(length = 6) {
  let code = "";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  for (let i = 0; i < length; i++) {
    code += JOIN_CODE_ALPHABET[bytes[i] % JOIN_CODE_ALPHABET.length];
  }
  return code;
}
