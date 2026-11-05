# Secure Deepgram transcription deployment

The browser never receives the Deepgram key. It posts recorded answer audio to a Cloudflare Worker; only the Worker reads DEEPGRAM_API_KEY and calls Deepgram REST.

## Exact prerequisites

- Cloudflare account with Workers enabled and Wrangler authenticated (npx wrangler login).
- Deepgram API key permitted to use speech-to-text REST.
- Exact HTTPS origin(s) serving this app, e.g. https://flags.example.com.
- Node.js/npm to run Wrangler. Do not put the key in this repository or static-site configuration.

## Deploy

    cd worker
    npx wrangler secret put DEEPGRAM_API_KEY
    npx wrangler secret put ALLOWED_ORIGIN
    npx wrangler deploy

Enter one or more comma-separated exact HTTPS origins (no trailing slash) for ALLOWED_ORIGIN. The Worker rejects browser origins outside this allow-list. It only supports POST /transcribe and CORS OPTIONS.

## Configure the static app

After deployment, set the content of the jacksflags-transcription-endpoint meta tag in index.html to:

    https://<your-worker>.<your-subdomain>.workers.dev/transcribe

Deploy the static page to an origin included in ALLOWED_ORIGIN. If the meta value stays blank, the existing Web Speech API fallback is used. Never put a Deepgram key in HTML, JavaScript, local storage, or a browser-exposed static-host variable.

## Limits

The Worker accepts audio only, up to 10 MiB, and returns a normalized transcript capped at 280 characters. Provider errors are intentionally reduced to generic client-safe errors.
