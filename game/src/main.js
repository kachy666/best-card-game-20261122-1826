// Boot and input: clicks and keys drive the engine, the renderer paints the result.
// ?seed=N fixes the shuffle. ?shot=title|table|win|loss (with &seed=N) stages that
// scene instead of running the loop, paints it twice and sets window.__shotReady.
import { createGame, startMatch, playCard, endTurn } from './engine.js';
import { renderGame, SCREEN_TITLE, SCREEN_PLAY, SCREEN_WON, SCREEN_LOST } from './render.js';
import { stageShot } from './shots.js';
import { playCardSound, endTurnSound, winSound, loseSound, selectSound } from './sound.js';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const root = document.getElementById('app');
const status = document.getElementById('status');
let state = createGame(seed);
let screen = SCREEN_TITLE;
let selectedUid = null;
let announcedEnd = false;

function announce(message) {
  status.textContent = message;
}

function paint() {
  renderGame(root, state, screen, selectedUid);
}

function syncScreen() {
  if (state.phase === 'won' && screen !== SCREEN_WON) {
    screen = SCREEN_WON;
    if (!announcedEnd) {
      winSound();
      announce(`You win! Final score ${state.score}.`);
      announcedEnd = true;
    }
  } else if (state.phase === 'lost' && screen !== SCREEN_LOST) {
    screen = SCREEN_LOST;
    if (!announcedEnd) {
      loseSound();
      announce(`You lose. Final score ${state.score}.`);
      announcedEnd = true;
    }
  } else if (state.phase === 'play') {
    screen = SCREEN_PLAY;
  }
}

function playSelected() {
  if (!selectedUid) return;
  const uid = selectedUid;
  selectedUid = null;
  if (playCard(state, 'player', uid)) {
    playCardSound();
    syncScreen();
  }
  paint();
}

function endPlayerTurn() {
  if (endTurn(state)) {
    endTurnSound();
    syncScreen();
    paint();
  }
}

function startNewGame() {
  state = createGame(seed);
  startMatch(state);
  selectedUid = null;
  announcedEnd = false;
  screen = SCREEN_PLAY;
  announce('Round 1. Play a card, then end your turn.');
  paint();
}

function runShot(name) {
  const staged = stageShot(name, seed);
  state = staged.state;
  screen = staged.screen;
  let painted = 0;
  function paintOnce() {
    paint();
    painted += 1;
    if (painted < 2) requestAnimationFrame(paintOnce);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paintOnce);
}

function runGame() {
  paint();
  announce('Soup Sabotage. Press Space or click Start Cooking.');

  root.addEventListener('click', (event) => {
    const start = event.target.closest('#start-game');
    if (start) {
      startNewGame();
      return;
    }
    const again = event.target.closest('#play-again');
    if (again) {
      startNewGame();
      return;
    }
    const end = event.target.closest('#end-turn');
    if (end) {
      endPlayerTurn();
      return;
    }
    const card = event.target.closest('.card[data-uid]');
    if (card && screen === SCREEN_PLAY && state.turn === 'player') {
      const uid = card.dataset.uid;
      if (selectedUid === uid) {
        playSelected();
      } else {
        selectedUid = uid;
        selectSound();
        paint();
      }
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    const key = event.key.toLowerCase();
    if (screen === SCREEN_TITLE && (key === ' ' || key === 'enter')) {
      event.preventDefault();
      startNewGame();
      return;
    }
    if ((screen === SCREEN_WON || screen === SCREEN_LOST) && (key === 'r' || key === ' ' || key === 'enter')) {
      event.preventDefault();
      startNewGame();
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    if (key >= '1' && key <= '7') {
      const index = Number(key) - 1;
      const card = state.player.hand[index];
      if (card) {
        selectedUid = card.uid;
        selectSound();
        paint();
      }
      return;
    }
    if (key === 'enter' || key === ' ') {
      event.preventDefault();
      playSelected();
      return;
    }
    if (key === 'e') {
      endPlayerTurn();
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) announce('Soup Sabotage paused — your pot is keeping warm.');
  });
}

if (shot) runShot(shot);
else runGame();
