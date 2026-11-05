# Live Deepgram transcription deployment

The game keeps one WebSocket open to its Cloudflare Worker for the active game. The browser captures microphone audio with Web Audio, downmixes and resamples it to mono 16 kHz, and sends 160 ms signed 16-bit little-endian PCM chunks. The Worker opens the authenticated Deepgram Listen WebSocket and forwards binary audio plus Deepgram transcript/events unchanged. Interim results are used immediately. The browser never receives a Deepgram key or a temporary token.

## One-time Cloudflare dashboard deployment

**Re-paste the contents of worker/src/index.js into your Cloudflare Worker in the dashboard and deploy it.** This replaces the old /token design: the deployed Worker now exposes only the WebSocket endpoint GET /live. /token and /transcribe are intentionally gone.

Set these Worker secrets/variables in **Settings → Variables and Secrets**:

- **DEEPGRAM_API_KEY** — your existing long-lived Deepgram key, stored as a secret.
- **ALLOWED_ORIGIN** — comma-separated exact HTTPS game origin(s), such as https://flags.example.com (no trailing slash).

Only the existing **DEEPGRAM_API_KEY** is required. It does **not** need Deepgram's Member permission: the Worker authenticates the Listen WebSocket directly using the standard Authorization Token header. Do not put the key in index.html, browser storage, or a browser-exposed hosting variable.

The Worker accepts /live only when the browser's Origin exactly matches ALLOWED_ORIGIN and the request is a WebSocket upgrade. It rejects other origins before opening an upstream Deepgram socket.

## Static app configuration

Set the jacksflags-transcription-endpoint meta tag in index.html to the Worker base URL, for example:

    https://jackflags-transcription.jamieasp.workers.dev

The page derives wss://…/live from that URL. For compatibility with the earlier configuration, a value ending in /transcribe, /token, or /live is normalized to the same Worker base URL. Deploy the static page to an origin included in ALLOWED_ORIGIN. If the meta tag is blank, the browser's Web Speech fallback is used.

## Operational behavior

- The browser sends 160 ms mono 16 kHz linear16 PCM chunks to the Worker; the Worker forwards them directly to Deepgram.
- Deepgram interim transcript messages are returned through the same Worker socket and matched immediately.
- Unexpected socket closes reconnect with capped backoff while the game remains active; Web Audio nodes/context, browser socket, microphone tracks, and Worker upstream socket clean up when the game ends or either side closes.

## Spoken-answer fallback adjudication

The Worker also exposes POST /judge. It is a fallback only: local country names and aliases are accepted immediately in the browser. Only a final Deepgram transcript that does not match locally is sent, once per card/text after a short debounce. This keeps LLM calls and cost low. No API key is ever sent to the browser.

Before deploying, add this required Cloudflare Worker secret in Settings → Variables and Secrets:

- **OPENAI_API_KEY** — required for /judge; create it with wrangler secret put OPENAI_API_KEY or add it in the dashboard. **Never put it in HTML, source control, browser storage, or a public hosting variable.**

Optionally set **OPENAI_MODEL** (defaults to gpt-4o-mini, an inexpensive mini model). Then deploy the updated Worker after setting DEEPGRAM_API_KEY, OPENAI_API_KEY, and ALLOWED_ORIGIN. /judge accepts only JSON POSTs from an exact ALLOWED_ORIGIN; it enforces a small body limit and returns only { "accept": boolean }. It uses schema-constrained OpenAI output and treats the transcript as untrusted data.
