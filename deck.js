(function (root) {
  "use strict";

  // A new deck is a uniform Fisher-Yates permutation. Gameplay consumes it
  // sequentially, so a country cannot recur until every eligible country has
  // appeared once.
  function shuffledDeck(cards, random) {
    const deck = cards.slice();
    const rng = random || Math.random;
    for (let i = deck.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  const api = { shuffledDeck };
  root.FlagDeck = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
}(typeof globalThis !== "undefined" ? globalThis : this));
