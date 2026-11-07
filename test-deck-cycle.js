const assert = require('node:assert/strict');
const fs = require('node:fs');
const { shuffledDeck } = require('./deck.js');

const flags = Array.from({ length: 195 }, (_, i) => ({ iso: 'f' + i }));
let seed = 123456789;
const deterministicRandom = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 0x100000000);
const firstDeck = shuffledDeck(flags, deterministicRandom);

assert.equal(firstDeck.length, flags.length);
assert.equal(new Set(firstDeck.map(flag => flag.iso)).size, flags.length, 'first deck contains no duplicates');
assert.deepEqual(new Set(firstDeck.map(flag => flag.iso)), new Set(flags.map(flag => flag.iso)));
assert.deepEqual(flags.map(flag => flag.iso), Array.from({ length: 195 }, (_, i) => 'f' + i), 'shuffle leaves the source intact');
for (let run = 0; run < 1000; run += 1) {
  assert.equal(new Set(shuffledDeck(flags).map(flag => flag.iso)).size, flags.length);
}
assert.match(fs.readFileSync('index.html', 'utf8'), /FlagDeck\.shuffledDeck\(getFilteredFlags\(\)\)/);
const play = fs.readFileSync('play/index.html', 'utf8');
assert.match(play, /FlagDeck\.shuffledDeck\(flags\)/);
assert.match(play, /id=\"heard\" aria-live=\"polite\">Waiting to hear you…/);
assert.match(play, /function waitingToHear\(\)[\s\S]*?Waiting to hear you…/);
assert.match(play, /function showHeard\(text\)[\s\S]*?I heard: “/);
assert.match(play, /if\s*\(m\.type\s*!==\s*['\"]Results['\"]\)\s*return;[\s\S]*?showHeard\(t\);[\s\S]*?submit\(t,\s*true\)/);
console.log('Deterministic first-deck, voice-transcription UI, and 1000-cycle simulations passed for root and play.');
