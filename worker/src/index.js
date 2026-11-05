const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
const MAX_TRANSCRIPT_CHARS = 280;
function allowedOrigins(env) { return (env.ALLOWED_ORIGIN || "").split(",").map(value => value.trim()).filter(Boolean); }
function isAllowed(request, env) { const origin = request.headers.get("Origin"); return !origin || allowedOrigins(env).includes(origin); }
function corsHeaders(request, env) { const origin = request.headers.get("Origin"); return { "Access-Control-Allow-Origin": origin && allowedOrigins(env).includes(origin) ? origin : "", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "86400", "Vary": "Origin" }; }
function json(request, env, body, status = 200) { return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders(request, env), "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } }); }
export default { async fetch(request, env) {
  if (new URL(request.url).pathname !== "/transcribe") return new Response("Not found", { status: 404 });
  if (request.method === "OPTIONS") return isAllowed(request, env) ? new Response(null, { status: 204, headers: corsHeaders(request, env) }) : new Response(null, { status: 403 });
  if (request.method !== "POST") return json(request, env, { error: "method_not_allowed" }, 405);
  if (!isAllowed(request, env)) return json(request, env, { error: "origin_not_allowed" }, 403);
  if (!env.DEEPGRAM_API_KEY) return json(request, env, { error: "transcription_not_configured" }, 503);
  const contentType = (request.headers.get("Content-Type") || "").split(";", 1)[0].toLowerCase();
  if (!contentType.startsWith("audio/") && contentType !== "application/octet-stream") return json(request, env, { error: "invalid_audio_type" }, 415);
  if (Number(request.headers.get("Content-Length") || "0") > MAX_AUDIO_BYTES) return json(request, env, { error: "audio_too_large" }, 413);
  const audio = await request.arrayBuffer();
  if (!audio.byteLength) return json(request, env, { error: "empty_audio" }, 400);
  if (audio.byteLength > MAX_AUDIO_BYTES) return json(request, env, { error: "audio_too_large" }, 413);
  let upstream;
  try { upstream = await fetch("https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&language=en", { method: "POST", headers: { Authorization: "Token " + env.DEEPGRAM_API_KEY, "Content-Type": contentType }, body: audio }); }
  catch (_) { return json(request, env, { error: "transcription_unavailable" }, 502); }
  if (!upstream.ok) return json(request, env, { error: "transcription_failed" }, 502);
  try { const payload = await upstream.json(); const transcript = String(payload?.results?.channels?.[0]?.alternatives?.[0]?.transcript || "").replace(/\s+/g, " ").trim().slice(0, MAX_TRANSCRIPT_CHARS); return json(request, env, { transcript }); }
  catch (_) { return json(request, env, { error: "invalid_transcription_response" }, 502); }
} };
