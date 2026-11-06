# Voice transcription and fallback adjudication

The browser streams microphone PCM to \`GET /live\`; the Worker proxies that WebSocket to Deepgram using its server-side \`DEEPGRAM_API_KEY\`. Exact country and alias matching remains immediate in the browser. Only a **final**, unmatched Deepgram transcript is debounced and sent once per card/transcript to \`POST /judge\` for optional OpenAI adjudication.

## One-time Cloudflare Dashboard deployment

1. Open **Workers & Pages → jacksflags-transcription → Edit code**.
2. Replace the Worker source with \`worker/src/index.js\` from this repository, then click **Deploy**.
3. Open **Settings → Variables and Secrets → Add** and create these values:
   - \`DEEPGRAM_API_KEY\` — **Secret**, existing Deepgram API key.
   - \`OPENAI_API_KEY\` — **Secret**, OpenAI API key for the fallback judge.
   - \`ALLOWED_ORIGIN\` — exact comma-separated HTTPS game origin(s), e.g. \`https://flags.example.com\` (no trailing slash).
   - \`OPENAI_MODEL\` — optional variable (or secret); defaults to the inexpensive \`gpt-4o-mini\`.
4. Deploy the static \`play/index.html\` at an origin included in \`ALLOWED_ORIGIN\`. Its \`jacksflags-transcription-endpoint\` meta value must be the Worker base URL.

Never put either API key in \`play/index.html\`, browser storage, or a public hosting variable. The Worker requires an exact \`Origin\`, accepts \`/judge\` only as JSON \`POST\`, enforces a small strict request schema/body limit, and makes OpenAI calls server-side.

## Privacy and cost

The normal exact-match path never calls OpenAI. For an unmatched final transcript only, the browser sends the final transcript plus the displayed target country and its aliases to the Worker, which forwards that data to OpenAI. No audio is sent to OpenAI. Fallback-only use, final-result filtering, debounce, and card/transcript deduplication keep calls and cost low. If OpenAI is unavailable, gameplay simply continues with normal typing and exact voice matching.
