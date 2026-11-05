function allowedOrigins(env) {
  return (env.ALLOWED_ORIGIN || "").split(",").map(value => value.trim()).filter(Boolean);
}

function isAllowed(request, env) {
  const origin = request.headers.get("Origin");
  return Boolean(origin) && allowedOrigins(env).includes(origin);
}

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin");
  return {
    "Access-Control-Allow-Origin": origin && allowedOrigins(env).includes(origin) ? origin : "",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

function json(request, env, body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(request, env),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== "/token") return new Response("Not found", { status: 404 });
    if (!isAllowed(request, env)) return new Response("Forbidden", { status: 403 });
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    if (request.method !== "GET") return json(request, env, { error: "method_not_allowed" }, 405);
    if (!env.DEEPGRAM_API_KEY) return json(request, env, { error: "transcription_not_configured" }, 503);

    let upstream;
    try {
      upstream = await fetch("https://api.deepgram.com/v1/auth/grant", {
        method: "POST",
        headers: { Authorization: "Token " + env.DEEPGRAM_API_KEY }
      });
    } catch (_) {
      return json(request, env, { error: "token_unavailable" }, 502);
    }
    if (!upstream.ok) return json(request, env, { error: "token_unavailable" }, 502);

    try {
      const payload = await upstream.json();
      const accessToken = String(payload?.access_token || "");
      const expiresIn = Number(payload?.expires_in);
      if (!accessToken || !Number.isFinite(expiresIn) || expiresIn <= 0) throw new Error("invalid_grant");
      return json(request, env, { access_token: accessToken, expires_in: expiresIn });
    } catch (_) {
      return json(request, env, { error: "token_unavailable" }, 502);
    }
  }
};
