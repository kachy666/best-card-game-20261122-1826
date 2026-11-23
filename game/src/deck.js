// The pantry: every card in Soup Sabotage, its four flavour suits and the deck builder.
// Suits are told apart by colour AND shape, never by text alone:
//   sweet = pink circle, spicy = red triangle, sour = lime diamond, umami = amber square.
export const SUITS = {
  sweet: { name: 'Sweet', glyph: '●', color: '#ff6fa5', dark: '#c2255c' },
  spicy: { name: 'Spicy', glyph: '▲', color: '#ff4d2e', dark: '#b3271e' },
  sour: { name: 'Sour', glyph: '◆', color: '#7ac74f', dark: '#3f7a1e' },
  umami: { name: 'Umami', glyph: '■', color: '#e8a33d', dark: '#9a6212' },
};

/**
 * One card. kind is attack | heal | shield | draw | trick.
 * power means damage, healing or block depending on kind; draw cards draw `power` cards.
 * trick cards carry a `pierce` flag (ignores the enemy shield) or a `snack` flag (heal + draw).
 */
export const CARD_POOL = [
  { id: 'chili-bomb', name: 'Chili Bomb', suit: 'spicy', cost: 3, power: 6, kind: 'attack', text: 'Deal 6 belly damage.' },
  { id: 'ghost-pepper', name: 'Ghost Pepper', suit: 'spicy', cost: 2, power: 5, kind: 'attack', text: 'Deal 5 belly damage.' },
  { id: 'salt-wound', name: 'Salt in the Wound', suit: 'spicy', cost: 2, power: 3, kind: 'trick', pierce: true, text: 'Deal 3. Pierces shields.' },
  { id: 'spice-rack', name: 'Spice Rack', suit: 'spicy', cost: 1, power: 2, kind: 'draw', text: 'Draw 2 cards.' },
  { id: 'honey-hammer', name: 'Honey Hammer', suit: 'sweet', cost: 2, power: 4, kind: 'attack', text: 'Deal 4 belly damage.' },
  { id: 'caramel-cannon', name: 'Caramel Cannon', suit: 'sweet', cost: 3, power: 5, kind: 'attack', text: 'Deal 5 belly damage.' },
  { id: 'sugar-rush', name: 'Sugar Rush', suit: 'sweet', cost: 1, power: 3, kind: 'attack', text: 'Deal 3 belly damage.' },
  { id: 'honey-glaze', name: 'Honey Glaze', suit: 'sweet', cost: 2, power: 5, kind: 'heal', text: 'Heal 5 belly.' },
  { id: 'butter-wall', name: 'Butter Wall', suit: 'sweet', cost: 2, power: 6, kind: 'shield', text: 'Gain 6 block.' },
  { id: 'second-helping', name: 'Second Helping', suit: 'sweet', cost: 2, power: 1, kind: 'trick', snack: true, text: 'Heal 2 and draw 1.' },
  { id: 'pickle-slap', name: 'Pickle Slap', suit: 'sour', cost: 1, power: 2, kind: 'attack', text: 'Deal 2 belly damage.' },
  { id: 'lemon-zing', name: 'Lemon Zing', suit: 'sour', cost: 2, power: 3, kind: 'attack', text: 'Deal 3 belly damage.' },
  { id: 'vinegar-volley', name: 'Vinegar Volley', suit: 'sour', cost: 3, power: 5, kind: 'attack', text: 'Deal 5 belly damage.' },
  { id: 'rotten-egg', name: 'Rotten Egg', suit: 'sour', cost: 2, power: 4, kind: 'attack', text: 'Deal 4 belly damage.' },
  { id: 'pickle-shield', name: 'Pickle Shield', suit: 'sour', cost: 1, power: 4, kind: 'shield', text: 'Gain 4 block.' },
  { id: 'mint-cooler', name: 'Mint Cooler', suit: 'sour', cost: 1, power: 2, kind: 'heal', text: 'Heal 2 and draw 1.', snack: true },
  { id: 'mushroom-mallet', name: 'Mushroom Mallet', suit: 'umami', cost: 2, power: 4, kind: 'attack', text: 'Deal 4 belly damage.' },
  { id: 'truffle-trouble', name: 'Truffle Trouble', suit: 'umami', cost: 3, power: 6, kind: 'attack', text: 'Deal 6 belly damage.' },
  { id: 'broth-hug', name: 'Broth Hug', suit: 'umami', cost: 1, power: 3, kind: 'heal', text: 'Heal 3 belly.' },
  { id: 'mystery-stew', name: 'Mystery Stew', suit: 'umami', cost: 1, power: 2, kind: 'draw', text: 'Draw 2 cards.' },
];

/** Small seeded RNG (mulberry32) so screenshot scenes replay exactly. */
export function createRandom(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A fresh shuffled deck: two copies of the pool, shuffled with the given RNG. */
export function buildDeck(random) {
  const cards = [];
  for (const def of CARD_POOL) {
    cards.push({ ...def, uid: `${def.id}-a` });
    cards.push({ ...def, uid: `${def.id}-b` });
  }
  for (let i = cards.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

/** Look a card definition up by id (used by the renderer's legend). */
export function cardDef(id) {
  return CARD_POOL.find((c) => c.id === id) ?? null;
}
