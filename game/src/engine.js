// The rules of Soup Sabotage: two goblin chefs, one pot each, 20 belly apiece.
// A turn: spend up to 3 peppers (energy) playing cards from a hand of 5, then the rival
// answers. Playing two cards of the same flavour suit in one turn triggers the
// Seasoning Chain: the second card gets +2 to whatever it does. First belly to 0 loses.
import { buildDeck } from './deck.js';

export const MAX_BELLY = 20;
export const MAX_PEPPERS = 3;
export const HAND_SIZE = 5;
export const MAX_HAND = 7;
export const COMBO_BONUS = 2;
export const WIN_SCORE_PER_DAMAGE = 1;
export const COMBO_SCORE = 5;

/** Fresh game state for a seed. */
export function createGame(seed) {
  const random = (() => {
    let a = seed >>> 0;
    return () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  })();
  const deck = buildDeck(random);
  const state = {
    seed,
    round: 1,
    turn: 'player',
    phase: 'title',
    score: 0,
    combos: 0,
    damageDealt: 0,
    cardsPlayed: 0,
    lastSuit: null,
    log: ['Welcome to the pantry. The Baron is already stirring.'],
    player: { name: 'Chef Pip', belly: MAX_BELLY, block: 0, peppers: MAX_PEPPERS, hand: [], deck: deck.slice(0, 20), discard: [] },
    rival: { name: 'Baron Brine', belly: MAX_BELLY, block: 0, peppers: MAX_PEPPERS, hand: [], deck: deck.slice(20), discard: [] },
  };
  state.random = random;
  drawCards(state, state.player, HAND_SIZE);
  drawCards(state, state.rival, HAND_SIZE);
  return state;
}

/** Move up to `count` cards from a side's deck into its hand (reshuffling the discard first). */
export function drawCards(state, side, count) {
  for (let i = 0; i < count; i += 1) {
    if (side.hand.length >= MAX_HAND) break;
    if (side.deck.length === 0) {
      if (side.discard.length === 0) break;
      side.deck = side.discard;
      side.discard = [];
      for (let j = side.deck.length - 1; j > 0; j -= 1) {
        const k = Math.floor(state.random() * (j + 1));
        [side.deck[j], side.deck[k]] = [side.deck[k], side.deck[j]];
      }
    }
    side.hand.push(side.deck.pop());
  }
}

function say(state, message) {
  state.log.push(message);
  if (state.log.length > 6) state.log.shift();
}

/** Damage after block; returns the belly damage actually dealt. */
function dealDamage(state, target, amount, pierce) {
  let left = amount;
  if (!pierce && target.block > 0) {
    const soaked = Math.min(target.block, left);
    target.block -= soaked;
    left -= soaked;
  }
  target.belly = Math.max(0, target.belly - left);
  return left;
}

/**
 * Play `card` (a uid in the acting side's hand) against the other side.
 * Returns false when the card cannot be played (wrong turn, not in hand, too dear).
 */
export function playCard(state, actorKey, uid) {
  const actor = state[actorKey];
  const foe = state[actorKey === 'player' ? 'rival' : 'player'];
  if (state.phase !== 'play' || state.turn !== actorKey) return false;
  const index = actor.hand.findIndex((c) => c.uid === uid);
  if (index < 0) return false;
  const card = actor.hand[index];
  if (card.cost > actor.peppers) return false;
  actor.peppers -= card.cost;
  actor.hand.splice(index, 1);
  actor.discard.push(card);
  state.cardsPlayed += 1;

  const chained = state.lastSuit === card.suit;
  if (chained) state.combos += 1;
  state.lastSuit = card.suit;
  const bonus = chained ? COMBO_BONUS : 0;
  const who = actorKey === 'player' ? 'You' : actor.name;
  const chainNote = chained ? ' Seasoning Chain +2!' : '';

  if (card.kind === 'attack' || (card.kind === 'trick' && card.pierce)) {
    const dealt = dealDamage(state, foe, card.power + bonus, !!card.pierce);
    if (actorKey === 'player') {
      state.damageDealt += dealt;
      state.score += dealt * WIN_SCORE_PER_DAMAGE + (chained ? COMBO_SCORE : 0);
    }
    say(state, `${who} played ${card.name} — ${dealt} damage!${chainNote}`);
  } else if (card.kind === 'heal') {
    const healed = Math.min(card.power + bonus, MAX_BELLY - actor.belly);
    actor.belly += healed;
    say(state, `${who} played ${card.name} — healed ${healed}.${chainNote}`);
    if (card.snack) drawCards(state, actor, 1);
  } else if (card.kind === 'shield') {
    actor.block += card.power + bonus;
    say(state, `${who} played ${card.name} — +${card.power + bonus} block.${chainNote}`);
  } else if (card.kind === 'draw') {
    drawCards(state, actor, card.power);
    say(state, `${who} played ${card.name} — drew ${card.power}.${chainNote}`);
  } else if (card.kind === 'trick' && card.snack) {
    const healed = Math.min(2, MAX_BELLY - actor.belly);
    actor.belly += healed;
    drawCards(state, actor, 1);
    say(state, `${who} played ${card.name} — healed ${healed}, drew 1.${chainNote}`);
  }
  checkEnd(state);
  return true;
}

/** Has either belly hit zero? Sets the phase to won or lost. */
export function checkEnd(state) {
  if (state.rival.belly <= 0 && state.player.belly <= 0) {
    state.phase = state.damageDealt >= 0 ? 'won' : 'lost';
  } else if (state.rival.belly <= 0) {
    state.phase = 'won';
    state.score += 25;
  } else if (state.player.belly <= 0) {
    state.phase = 'lost';
  }
}

/** End the player's turn: the rival answers, then a new round begins. */
export function endTurn(state) {
  if (state.phase !== 'play' || state.turn !== 'player') return false;
  state.turn = 'rival';
  state.lastSuit = null;
  rivalTurn(state);
  if (state.phase === 'play') {
    state.round += 1;
    state.turn = 'player';
    state.player.peppers = MAX_PEPPERS;
    state.rival.peppers = MAX_PEPPERS;
    state.lastSuit = null;
    drawCards(state, state.player, 2);
    drawCards(state, state.rival, 2);
    say(state, `Round ${state.round} — your pot bubbles. Draw 2, peppers refilled.`);
  }
  return true;
}

/** The Baron's brain: heal when starving, shield when hurt, else throw the biggest pan he can afford. */
export function rivalTurn(state) {
  const rival = state.rival;
  const player = state.player;
  let guard = 0;
  while (guard < 4 && state.phase === 'play') {
    guard += 1;
    const affordable = rival.hand.filter((c) => c.cost <= rival.peppers);
    if (affordable.length === 0) break;
    let pick = null;
    if (rival.belly <= 7) {
      pick = affordable.filter((c) => c.kind === 'heal').sort((a, b) => b.power - a.power)[0]
        ?? affordable.filter((c) => c.kind === 'shield').sort((a, b) => b.power - a.power)[0];
    }
    if (!pick && player.block > 0) {
      pick = affordable.filter((c) => c.kind === 'trick' && c.pierce)[0];
    }
    if (!pick) {
      pick = affordable.filter((c) => c.kind === 'attack').sort((a, b) => (b.power - b.cost) - (a.power - a.cost))[0]
        ?? affordable.sort((a, b) => b.power - a.power)[0];
    }
    if (!pick) break;
    // The Baron never spends his last pepper on a draw when he could hit instead.
    if (pick.kind === 'draw' && affordable.some((c) => c.kind === 'attack' && c.cost <= rival.peppers)) {
      const hit = affordable.filter((c) => c.kind === 'attack').sort((a, b) => b.power - a.power)[0];
      if (hit) pick = hit;
    }
    playCard(state, 'rival', pick.uid);
  }
  if (state.phase === 'play') say(state, 'Baron Brine stirs his pot and waits, smug.');
}

/** Start a fresh match from the title screen. */
export function startMatch(state) {
  const fresh = createGame(state.seed);
  Object.keys(fresh).forEach((k) => { state[k] = fresh[k]; });
  state.phase = 'play';
  say(state, 'Round 1 — play a card, then End Turn. Same flavour twice in a row chains +2!');
}
