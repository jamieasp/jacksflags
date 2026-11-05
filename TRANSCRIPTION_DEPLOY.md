# Live Deepgram transcription deployment

The game keeps one Deepgram Live WebSocket open for the active game. The browser sends 150 ms WebM/Opus `MediaRecorder` chunks and uses interim results immediately. It never receives the long-lived Deepgram key. Instead, it requests a short-lived token from the Worker immediately before each WebSocket connection, then authenticates using Deepgram's WebSocket subprotocol: `new WebSocket(url, ['token', accessToken])`.

## One-time Cloudflare dashboard deployment

This Worker has changed from the former `/transcribe` audio-upload proxy. **Re-paste the contents of `worker/src/index.js` into your Cloudflare Worker in the dashboard and deploy it.** The deployed Worker now exposes only `GET /token` (plus CORS `OPTIONS`); `/transcribe` is intentionally gone.

Set these Worker secrets/variables in **Settings → Variables and Secrets**:

- `DEEPGRAM_API_KEY` — your long-lived Deepgram key, stored as a secret.
- `ALLOWED_ORIGIN` — comma-separated exact HTTPS game origin(s), such as `https://flags.example.com` (no trailing slash).

The Worker requires a request `Origin` that exactly matches `ALLOWED_ORIGIN`; it returns no token to other origins. Do not put the Deepgram key in the static app, browser storage, or a browser-exposed hosting variable.

### Deepgram permission required

`POST /v1/auth/grant` requires a Deepgram API key with the **Member** permission. Check the existing key's role/permissions in Deepgram first. If it already has Member permission, keep it — only redeploy the Worker. If it does not, create a replacement Member-permission key in Deepgram, replace **only** the Worker secret `DEEPGRAM_API_KEY`, and deploy the Worker again. Never add that key to `index.html`.

## Static app configuration

Set the `jacksflags-transcription-endpoint` meta tag in `index.html` to the Worker base URL, for example:

    https://jackflags-transcription.jamieasp.workers.dev

For compatibility with the previous setting, the app also accepts a value ending in `/transcribe` and derives `/token` from it. Deploy the static page to an origin included in `ALLOWED_ORIGIN`. If the meta tag is blank, the browser's Web Speech fallback is used.

## Operational behavior

- `GET /token` is called just before initial connect and before reconnects, so a stale/expired temporary token is never reused.
- Unexpected socket closes reconnect with capped backoff while the game remains active; the recorder and socket are cleaned up when it ends.
- Only temporary credentials reach the browser; the Worker response is `no-store` and contains only `access_token` and `expires_in`.
