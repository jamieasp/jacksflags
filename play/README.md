# Flags, please!

The `/play/` route is a deliberately separate, one-screen children’s edition of JacksFlags. It uses the existing secure live transcription Worker configured in the page meta tag; the browser receives no provider credentials. Voice is optional: typing always works.

## Nova-3 country vocabulary

`play/keyterms.js` is a committed, pre-generated static map: no country-list generation, network request, or model call happens at play time. Each country’s pack is capped at 100 plain terms. The country itself and its accepted aliases/phonetic variants come first, followed by reliable shared/twin-flag alternatives, name/pronunciation families, same-continent countries, then a continent-balanced general set.

For every new card the browser sends Deepgram a `Configure` text message with that pack before the card is armed for speech. The current card is also configured when the live socket opens, so a newly opened/reopened socket uses the active card without adding a transition or reconnect step. Stale session/card calls are ignored; microphone PCM remains binary WebSocket traffic and the LLM judging fallback is unchanged.

Deepgram keyterms bias transcription toward likely country names; they do **not** force an answer to be transcribed as the target. The answer is never rendered into the game UI by this feature.
