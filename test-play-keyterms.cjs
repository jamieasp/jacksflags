const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const play = fs.readFileSync('play/index.html', 'utf8');
const rawMatch = play.match(/const RAW = (\[[\s\S]*?\n\]);\n\nconst HOMOPHONES/);
assert.ok(rawMatch, 'play RAW country data is available');
const raw = Function('return ' + rawMatch[1])();
const context = {};
vm.runInNewContext(fs.readFileSync('play/keyterms.js', 'utf8'), context);
const packs = context.FlagKeyterms;
assert.ok(packs && typeof packs === 'object', 'static keyterm pack map is exported');
assert.deepEqual(Object.keys(packs).sort(), raw.map(row => row[0]).sort(), 'every game country has a keyterm pack');
for (const [iso, country, , , , aliasString] of raw) {
  const pack = packs[iso];
  assert.ok(Array.isArray(pack), iso + ' pack is an array');
  assert.ok(pack.length > 0 && pack.length <= 100, iso + ' has at most 100 plain keyterms');
  assert.equal(pack[0], country, iso + ' target leads its pack');
  const aliases = (aliasString || '').split(',').map(value => value.trim()).filter(Boolean);
  assert.deepEqual(Array.from(pack.slice(1, aliases.length + 1)), aliases, iso + ' aliases immediately follow its target');
  assert.ok(pack.every(term => typeof term === 'string' && term.trim() === term && term.length > 0), iso + ' keyterms are plain non-empty strings');
}
assert.match(play, /<script src="keyterms\.js"><\/script>/, 'play loads only the committed static map');
assert.match(play, /voice\.configureForCard\(game\.sessionId, game\.cardId, game\.flag\)/, 'each card requests Configure');
assert.match(play, /this\.configureForCard\(game\?\.sessionId, game\?\.cardId, game\?\.flag\);[\s\S]*?game\.ready = true;[\s\S]*?armCard\(\)/, 'socket-open Configure precedes speech evaluation');
assert.match(play, /game\.sessionId !== sessionId \|\| game\.cardId !== cardId \|\| game\.flag !== flag/, 'stale card and session Configure calls are rejected');
assert.match(play, /JSON\.stringify\(\{ type: 'Configure', keyterms \}\)/, 'Configure payload is valid text JSON with keyterms');
assert.match(play, /this\.socket\.send\(out\.buffer\)/, 'audio continues as binary PCM transport');
console.log('Static keyterm packs and safe Deepgram Configure delivery checks passed.');
