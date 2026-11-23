// Screenshot scenes behind ?shot=title|table|win|loss (with &seed=N).
// Each one plays the real rules forward from a fresh game with a simple autopilot,
// so the frame is what a short game really looks like — and the same seed always
// gives the same frame. The win scene's pilot cooks aggressively; the loss scene's
// pilot just stands there stirring air while the Baron works.
import { createGame, playCard, endTurn, startMatch } from './engine.js';
import { SCREEN_TITLE, SCREEN_PLAY, SCREEN_WON, SCREEN_LOST } from './render.js';

const TABLE_ROUNDS = 4;
const MAX_ROUNDS = 60;

/** Play the player's best affordable attacks, heal when starving, then end the turn. */
function cookAggressively(state) {
  let guard = 0;
  while (guard < 5 && state.phase === 'play' && state.turn === 'player') {
    guard += 1;
    const hand = state.player.hand.filter((c) => c.cost <= state.player.peppers);
    if (hand.length === 0) break;
    let pick = null;
    if (state.player.belly <= 8) {
      pick = hand.filter((c) => c.kind === 'heal').sort((a, b) => b.power - a.power)[0];
    }
    if (!pick) pick = hand.filter((c) => c.kind === 'attack').sort((a, b) => b.power - a.power)[0];
    if (!pick) pick = hand.sort((a, b) => b.power - a.power)[0];
    if (!pick) break;
    playCard(state, 'player', pick.uid);
  }
  if (state.phase === 'play') endTurn(state);
}

/** Stand there. Do nothing. Let the Baron cook. */
function standAndStir(state) {
  if (state.phase === 'play') endTurn(state);
}

/** Fresh match, already past the title screen. */
function freshMatch(seed) {
  const state = createGame(seed);
  startMatch(state);
  return state;
}

/**
 * Stage `name` on a fresh game and return { state, screen } for the renderer.
 * Unknown names stage the title.
 */
export function stageShot(name, seed) {
  if (name === 'table') {
    const state = freshMatch(seed);
    for (let round = 0; round < TABLE_ROUNDS && state.phase === 'play'; round += 1) {
      cookAggressively(state);
    }
    return { state, screen: state.phase === 'play' ? SCREEN_PLAY : state.phase === 'won' ? SCREEN_WON : SCREEN_LOST };
  }
  if (name === 'win') {
    const state = freshMatch(seed);
    for (let round = 0; round < MAX_ROUNDS && state.phase === 'play'; round += 1) {
      cookAggressively(state);
    }
    return { state, screen: state.phase === 'won' ? SCREEN_WON : SCREEN_PLAY };
  }
  if (name === 'loss') {
    const state = freshMatch(seed);
    for (let round = 0; round < MAX_ROUNDS && state.phase === 'play'; round += 1) {
      standAndStir(state);
    }
    return { state, screen: state.phase === 'lost' ? SCREEN_LOST : SCREEN_PLAY };
  }
  const state = createGame(seed);
  return { state, screen: SCREEN_TITLE };
}
