// The table: turns game state into DOM. Re-renders on every change; the browser
// paints it, and the screenshot scenes reuse the exact same paint path.
import { SUITS } from './deck.js';
import { MAX_BELLY, MAX_PEPPERS } from './engine.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_WON = 'won';
export const SCREEN_LOST = 'lost';

function esc(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function bellyBar(side) {
  const pct = Math.max(0, Math.round((side.belly / MAX_BELLY) * 100));
  const hearts = '♥'.repeat(Math.ceil(side.belly / 2)) + '<span class="dim">' + '♥'.repeat(Math.max(0, 10 - Math.ceil(side.belly / 2))) + '</span>';
  return `<div class="belly"><div class="belly-fill" style="width:${pct}%"></div>`
    + `<span class="belly-text">${hearts} ${side.belly}/${MAX_BELLY} BELLY</span></div>`
    + (side.block > 0 ? `<span class="block-badge">🛡 ${side.block} BLOCK</span>` : '');
}

function pepperPips(peppers) {
  let pips = '';
  for (let i = 0; i < MAX_PEPPERS; i += 1) {
    pips += `<span class="pip${i < peppers ? ' lit' : ''}">●</span>`;
  }
  return `<span class="peppers" title="Peppers: energy to play cards">${pips} PEPPERS</span>`;
}

/** One face-up card. `playable` dims it when its cost is out of reach. */
export function cardElement(card, playable, selected) {
  const suit = SUITS[card.suit];
  const costDots = '●'.repeat(card.cost);
  const verb = card.kind === 'attack' ? 'ATK' : card.kind === 'heal' ? 'HEAL' : card.kind === 'shield' ? 'BLOCK' : card.kind === 'draw' ? 'DRAW' : 'TRICK';
  return `<button class="card suit-${card.suit}${playable ? '' : ' too-dear'}${selected ? ' selected' : ''}" `
    + `data-uid="${card.uid}" style="--suit:${suit.color};--suit-dark:${suit.dark}" aria-label="${esc(card.name)}, ${suit.name}, cost ${card.cost}, ${card.text}">`
    + `<span class="card-cost" title="Cost in peppers">${costDots}</span>`
    + `<span class="card-glyph">${suit.glyph}</span>`
    + `<span class="card-power">${card.power}</span>`
    + `<span class="card-verb">${verb}</span>`
    + `<span class="card-name">${esc(card.name)}</span>`
    + `<span class="card-suit">${suit.glyph} ${suit.name.toUpperCase()}</span>`
    + `<span class="card-text">${esc(card.text)}</span>`
    + `</button>`;
}

function cardBack(index) {
  return `<div class="card back" style="--i:${index}"><span class="back-glyph">?</span><span class="back-word">BRINE</span></div>`;
}

function logPanel(state) {
  const lines = state.log.slice(-4).map((l) => `<li>${esc(l)}</li>`).join('');
  return `<div class="log"><h3>THE POT BUBBLES…</h3><ul>${lines}</ul></div>`;
}

function tableHtml(state, selectedUid) {
  const rival = state.rival;
  const player = state.player;
  const backs = rival.hand.map((_, i) => cardBack(i)).join('');
  const hand = player.hand.map((c) => cardElement(c, c.cost <= player.peppers && state.turn === 'player', selectedUid === c.uid)).join('');
  const chainHint = state.lastSuit
    ? `<p class="chain">Last flavour played: <b style="color:${SUITS[state.lastSuit].color}">${SUITS[state.lastSuit].glyph} ${SUITS[state.lastSuit].name}</b> — match it for <b>+2 Seasoning Chain</b>!</p>`
    : `<p class="chain">Play two cards of the same flavour in one turn for a <b>+2 Seasoning Chain</b>!</p>`;
  return `
  <header class="topbar">
    <div class="brand">SOUP SABOTAGE <span class="tagline">a goblin chef card duel</span></div>
    <div class="stats"><span>ROUND <b>${state.round}</b></span><span>SCORE <b>${state.score}</b></span><span>CHAINS <b>${state.combos}</b></span></div>
  </header>
  <main class="table">
    <section class="rival-row">
      <div class="chef rival-chef"><div class="avatar baron">B</div><div><div class="chef-name">Baron Brine</div><div class="chef-sub">Rival goblin · smells of vinegar</div></div></div>
      <div class="vitals">${bellyBar(rival)}</div>
      <div class="hand backs" aria-label="Baron Brine's hand, ${rival.hand.length} cards">${backs}</div>
    </section>
    <section class="middle">
      <div class="pots"><div class="pot yours"><span class="pot-emoji">🍲</span><span class="pot-label">YOUR POT</span></div><div class="vs">VS</div><div class="pot theirs"><span class="pot-emoji">🥘</span><span class="pot-label">BARON'S POT</span></div></div>
      ${logPanel(state)}
      ${chainHint}
    </section>
    <section class="player-row">
      <div class="chef"><div class="avatar pip">P</div><div><div class="chef-name">Chef Pip — YOU</div><div class="chef-sub">Goblin chef · undefeated at lunch</div></div></div>
      <div class="vitals">${bellyBar(player)}${pepperPips(player.peppers)}</div>
      <div class="hand mine" aria-label="Your hand">${hand || '<p class="empty-hand">No cards — end your turn to draw.</p>'}</div>
      <div class="actions">
        <button id="end-turn" ${state.turn === 'player' ? '' : 'disabled'}>END TURN ⏎</button>
        <p class="keys">Click a card to play it · keys 1–7 select · Enter plays · E ends turn</p>
      </div>
    </section>
  </main>`;
}

function overlayHtml(state, screen) {
  if (screen === SCREEN_TITLE) {
    return `<div class="overlay title-screen"><div class="panel">
      <p class="eyebrow">A CARD GAME ABOUT LUNCH, GRUDGES &amp; TOO MUCH CHILI</p>
      <h1>SOUP<br>SABOTAGE</h1>
      <p class="pitch">You are <b>Chef Pip</b>, goblin cook. <b>Baron Brine</b> has insulted your soup in front of the whole pantry. Settle it the honourable way: <b>throw ingredients at each other</b> until somebody's belly gives up.</p>
      <div class="rules">
        <div><b>♥ 20 BELLY</b><span>First pot to 0 loses.</span></div>
        <div><b>● 3 PEPPERS</b><span>Energy. Cards cost 1–3.</span></div>
        <div><b>◆ CHAIN +2</b><span>Same flavour twice in a turn.</span></div>
      </div>
      <div class="suits-legend">${Object.entries(SUITS).map(([key, s]) => `<span style="color:${s.color}">${s.glyph} ${s.name}</span>`).join('')}</div>
      <button id="start-game" class="big">START COOKING</button>
      <p class="fine">Click a card to play it, or press 1–7 then Enter. E ends your turn. Original game — no borrowed chefs were harmed.</p>
    </div></div>`;
  }
  if (screen === SCREEN_WON) {
    return `<div class="overlay win-screen"><div class="panel">
      <p class="eyebrow">THE BARON IS BEATEN</p>
      <h1>YOU WIN!</h1>
      <p class="pitch">Baron Brine's pot boils over. The pantry chants your name. <b>Chef Pip takes the Golden Ladle!</b></p>
      <p class="final-score">FINAL SCORE <b>${state.score}</b> · ${state.damageDealt} damage dealt · ${state.combos} chains · ${state.round} rounds</p>
      <button id="play-again" class="big">COOK AGAIN</button>
      <p class="fine">Press R or click to play again.</p>
    </div></div>`;
  }
  if (screen === SCREEN_LOST) {
    return `<div class="overlay lose-screen"><div class="panel">
      <p class="eyebrow">THE POT HAS SPOKEN</p>
      <h1>YOU LOSE!</h1>
      <p class="pitch">Your belly surrenders. Baron Brine ladles your soup into his trophy pot and does a little dance. <b>The pantry demands a rematch.</b></p>
      <p class="final-score">FINAL SCORE <b>${state.score}</b> · ${state.damageDealt} damage dealt · ${state.combos} chains · ${state.round} rounds</p>
      <button id="play-again" class="big">DEMAND REMATCH</button>
      <p class="fine">Press R or click to play again.</p>
    </div></div>`;
  }
  return '';
}

/** Paint the whole app for `state` on `screen`. Returns the root element. */
export function renderGame(root, state, screen, selectedUid) {
  root.innerHTML = tableHtml(state, selectedUid) + overlayHtml(state, screen);
  return root;
}
