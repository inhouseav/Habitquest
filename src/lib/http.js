export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function errorResponse(message, status = 400) {
  return json({ ok: false, error: message }, status);
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch (err) {
    return null;
  }
}
