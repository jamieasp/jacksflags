function allowedOrigins(env) {
  return (env.ALLOWED_ORIGIN || "").split(",").map(value => value.trim()).filter(Boolean);
}

function isAllowed(request, env) {
  const origin = request.headers.get("Origin");
  return Boolean(origin) && allowedOrigins(env).includes(origin);
}

function isWebSocketUpgrade(request) {
  return request.headers.get("Upgrade")?.toLowerCase() === "websocket";
}

function safeClose(socket, code = 1011, reason = "Connection closed") {
  if (!socket || socket.readyState === WebSocket.CLOSED) return;
  const safeCode = Number.isInteger(code) && code >= 1000 && code <= 4999 ? code : 1011;
  try { socket.close(safeCode, String(reason || "").slice(0, 123)); } catch (_) {}
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== "/live") return new Response("Not found", { status: 404 });
    if (!isAllowed(request, env)) return new Response("Forbidden", { status: 403 });
    if (request.method !== "GET") return new Response("Method not allowed", { status: 405 });
    if (!isWebSocketUpgrade(request)) return new Response("WebSocket upgrade required", { status: 426 });
    if (!env.DEEPGRAM_API_KEY) return new Response("Transcription unavailable", { status: 503 });

    let upstreamResponse;
    try {
      // The browser never sees this long-lived key. Query settings are passed through
      // so the client can request low-latency interim Deepgram results.
      upstreamResponse = await fetch("https://api.deepgram.com/v1/listen" + url.search, {
        headers: {
          Upgrade: "websocket",
          Authorization: "Token " + env.DEEPGRAM_API_KEY
        }
      });
    } catch (_) {
      return new Response("Transcription unavailable", { status: 502 });
    }

    const upstream = upstreamResponse.webSocket;
    if (!upstream) return new Response("Transcription unavailable", { status: 502 });

    const pair = new WebSocketPair();
    const client = pair[0];
    const browser = pair[1];
    browser.accept();
    upstream.accept();

    let closed = false;
    const closeBoth = (source, code, reason) => {
      if (closed) return;
      closed = true;
      const peer = source === browser ? upstream : browser;
      safeClose(peer, code, reason);
      safeClose(source, code, reason);
    };
    const forward = (from, to) => async event => {
      if (closed || to.readyState !== WebSocket.OPEN) return;
      try {
        // Browser WebSocket messages arrive at Workers as Blob objects. Passing one
        // through directly serializes it as "[object Blob]" to Deepgram, so convert
        // audio frames to raw binary first.
        const data = event.data instanceof Blob ? await event.data.arrayBuffer() : event.data;
        if (!closed && to.readyState === WebSocket.OPEN) to.send(data);
      } catch (_) { closeBoth(from, 1011, "Proxy forwarding failed"); }
    };

    // Browser audio is binary WebM/Opus; Deepgram events are forwarded unchanged.
    browser.addEventListener("message", forward(browser, upstream));
    upstream.addEventListener("message", forward(upstream, browser));
    browser.addEventListener("close", event => closeBoth(browser, event.code, event.reason));
    upstream.addEventListener("close", event => closeBoth(upstream, event.code, event.reason));
    browser.addEventListener("error", () => closeBoth(browser, 1011, "Browser socket error"));
    upstream.addEventListener("error", () => closeBoth(upstream, 1011, "Upstream socket error"));

    return new Response(null, { status: 101, webSocket: client });
  }
};
