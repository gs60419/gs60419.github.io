const ELEMENTS = ['fire', 'water', 'earth', 'ice', 'air', 'stone'];
const IMG_EXTS = ['png', 'jpg', 'jpeg', 'webp', 'svg'];

const imgCache = {};

const ELEM = {
  fire:  { label: '火', toa: '塔胡',   cls: 'elem-fire'  },
  water: { label: '水', toa: '加利',   cls: 'elem-water' },
  earth: { label: '土', toa: '歐努亞', cls: 'elem-earth' },
  ice:   { label: '冰', toa: '科帕卡', cls: 'elem-ice'   },
  air:   { label: '風', toa: '列瓦',   cls: 'elem-air'   },
  stone: { label: '石', toa: '波哈圖', cls: 'elem-stone' },
};

const ROWS = 8;
const COLS = 8;
const ENERGY_MAX = 100;

const ABILITY_BTN_TEXT = {
  fire:  '🔥 點火',
  water: '🌊 海浪',
  earth: '🪨 重拳',
  ice:   '❄️ 凍結',
  air:   '🌪️ 洗牌',
  stone: '💥 投石',
};

const ELEM_COLOR = {
  fire: '#e84040', water: '#3878e0', earth: '#888888',
  ice: '#70c0e8',  air:  '#50cc50',  stone: '#9a6030',
};

// ── Seal system constants (Level 12 Makuta) ───────────────────────
// 火冰水風土石 × 6封印，每500血一道，破完剩500血進最終演出
const SEAL_ORDER      = ['fire', 'ice', 'water', 'air', 'earth', 'stone'];
const SEAL_THRESHOLDS = [3000, 2500, 2000, 1500, 1000, 500];
const SEAL_TILES_NEEDED = 15;

// ── Tile helpers ───────────────────────────────────────────────────
// Tiles are plain strings ('fire') or bomb strings ('bomb-fire')
function getElem(tile) {
  if (!tile) return null;
  return tile.startsWith('bomb-') ? tile.slice(5) : tile;
}
function isBomb(tile) {
  return typeof tile === 'string' && tile.startsWith('bomb-');
}

// ── State ──────────────────────────────────────────────────────────
let board = [];
let selected = null;
let isAnimating = false;
let combo = 0;
let level = null;
let bossHp = 0;
let bossMaxHp = 0;
let shieldActive = false;
let energy = {};
let currentLevelId = 1;
const imageCache = {};

let infectedCells = new Map();
let bossAttackCountdown = 6;
let pendingCounterattack = false;
let damageBuffMult  = 1;
let damageBuffTurns = 0;
let multiBossTargets = null;  // array of {elem,name,hp,maxHp} for multiboss levels

let sealSystem       = false; // true on levels with 封印破除 mechanic
let sealPhase        = 0;     // index into SEAL_ORDER / SEAL_THRESHOLDS
let sealActive       = false; // boss is currently sealed (immune to damage)
let sealTilesCleared = 0;     // tiles of sealElem cleared since seal activated

// ── Image resolution ───────────────────────────────────────────────
function resolveImg(basePath) {
  if (imgCache[basePath] !== undefined) return Promise.resolve(imgCache[basePath]);
  return new Promise(resolve => {
    const exts = [...IMG_EXTS];
    function tryNext() {
      if (!exts.length) { imgCache[basePath] = null; return resolve(null); }
      const src = `${basePath}.${exts.shift()}`;
      const img = new Image();
      img.onload  = () => { imgCache[basePath] = src; resolve(src); };
      img.onerror = tryNext;
      img.src = src;
    }
    tryNext();
  });
}

// ── Image preload ──────────────────────────────────────────────────
async function preloadImages() {
  await Promise.all([
    ...ELEMENTS.map(async elem => {
      const src = await resolveImg(`assets/masks/${elem}`);
      imageCache[elem] = !!src;
    }),
    // Pre-cache Nuva Symbol images (assets/symbols/fire.png etc.)
    ...ELEMENTS.map(elem => resolveImg(`assets/symbols/${elem}`)),
  ]);
}

// ── Level loading ──────────────────────────────────────────────────
async function loadLevel(id) {
  const pad = String(id).padStart(2, '0');
  let data;
  try {
    const res = await fetch(`levels/level-${pad}.json`);
    data = await res.json();
  } catch {
    console.error(`無法載入關卡 ${id}`);
    return;
  }

  level = data;
  bossHp = bossMaxHp = level.boss.hp;
  shieldActive = !!level.boss.shield;
  energy = {};
  ELEMENTS.forEach(e => energy[e] = 0);
  selected = null;
  combo = 0;
  infectedCells = new Map();
  bossAttackCountdown = level.boss.attackInterval ?? 6;
  pendingCounterattack = false;
  damageBuffMult   = 1;
  damageBuffTurns  = 0;
  multiBossTargets = null;
  sealSystem       = !!(data.boss.sealSystem);
  sealPhase        = 0;
  sealActive       = false;
  sealTilesCleared = 0;
  document.getElementById('seal-info').classList.add('hidden');

  document.getElementById('chapter-title').textContent = level.title;
  document.getElementById('story-text').textContent    = level.story;
  document.getElementById('boss-name').textContent     = level.boss.name;

  if (level.boss.type === 'multiboss') {
    multiBossTargets = level.boss.targets.map(t => ({
      ...t,
      maxHp:     t.hp,
      id:        t.id ?? t.elem ?? t.elems?.[0],
      elems:     t.elems ?? (t.elem ? [t.elem] : []),
      colorElem: t.colorElem ?? t.elem ?? t.elems?.[0],
    }));
    bossHp = bossMaxHp = multiBossTargets.reduce((s, t) => s + t.hp, 0);
    shieldActive = false;

    // Portrait (multiboss can have an image too, e.g. L10 manas)
    const mbPortrait = document.getElementById('boss-portrait');
    if (level.boss.image) {
      const src = await resolveImg(`assets/bosses/${level.boss.image}`);
      if (src) { mbPortrait.src = src; mbPortrait.classList.remove('hidden'); }
      else      { mbPortrait.classList.add('hidden'); }
    } else {
      mbPortrait.classList.add('hidden');
    }

    renderMultiBossPanel();
  } else {
    restoreSingleBossPanel();
    const bossPortrait = document.getElementById('boss-portrait');
    if (level.boss.image) {
      const src = await resolveImg(`assets/bosses/${level.boss.image}`);
      if (src) { bossPortrait.src = src; bossPortrait.classList.remove('hidden'); }
      else      { bossPortrait.classList.add('hidden'); }
    } else {
      bossPortrait.classList.add('hidden');
    }

    const shieldDiv = document.getElementById('boss-shield-info');
    if (level.boss.shield) {
      document.getElementById('shield-label').textContent =
        `${ELEM[level.boss.shield]?.label ?? level.boss.shield}（${ELEM[level.boss.shield]?.toa ?? ''}）`;
      shieldDiv.classList.remove('hidden');
    } else {
      shieldDiv.classList.add('hidden');
    }
  }

  document.getElementById('victory-overlay').classList.add('hidden');
  currentLevelId = id;

  initBoard();
  renderEnergyBars();
  renderBoard();
  updateBossHpUI();

  if (level.intro_dialogue?.length) {
    isAnimating = true;
    await runDialogue(level.intro_dialogue);
    isAnimating = false;
  }
}

// ── Board init ─────────────────────────────────────────────────────
function initBoard() {
  let tries = 0;
  do {
    board = Array.from({ length: ROWS }, () =>
      Array.from({ length: COLS }, randomElem)
    );
    tries++;
  } while (findMatches().cells.length > 0 && tries < 100);
}

function randomElem() {
  return ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)];
}

// ── Rendering ──────────────────────────────────────────────────────
function renderBoard() {
  const el = document.getElementById('board');
  el.innerHTML = '';
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      el.appendChild(makeCell(r, c));
}

function makeCell(r, c) {
  const tile = board[r][c];
  const elem = getElem(tile);
  const cfg  = ELEM[elem];
  const bomb = isBomb(tile);

  const cell = document.createElement('div');
  cell.className = `cell ${cfg.cls}${bomb ? ' bomb-tile' : ''}`;
  cell.dataset.row = r;
  cell.dataset.col = c;
  cell.title = bomb
    ? `努瓦符文（${cfg.toa}）— 點擊引爆！`
    : `${cfg.toa}（${cfg.label}）`;

  if (infectedCells.has(r * COLS + c)) cell.classList.add('infected');

  if (bomb) {
    const symSrc = imgCache[`assets/symbols/${elem}`];
    if (symSrc) {
      const img = document.createElement('img');
      img.src = symSrc;
      img.className = 'mask-img';
      img.alt = `${cfg.toa} 努瓦符文`;
      cell.appendChild(img);
    } else {
      const lbl = document.createElement('span');
      lbl.className = 'bomb-label';
      lbl.textContent = '✦';
      cell.appendChild(lbl);
    }
  } else {
    const maskSrc = imgCache[`assets/masks/${elem}`];
    if (maskSrc) {
      const img = document.createElement('img');
      img.src       = maskSrc;
      img.className = 'mask-img';
      img.alt       = cfg.label;
      cell.appendChild(img);
    } else {
      cell.textContent = cfg.label;
    }
  }

  cell.addEventListener('click', () => onCellClick(r, c));
  return cell;
}

function cellEl(r, c) {
  return document.getElementById('board').children[r * COLS + c];
}

function refreshCell(r, c, dropping = false) {
  const old  = cellEl(r, c);
  const next = makeCell(r, c);
  if (dropping) next.classList.add('dropping');
  old.replaceWith(next);
}

// ── Energy bars ────────────────────────────────────────────────────
function renderEnergyBars() {
  const panel = document.getElementById('energy-panel');
  panel.innerHTML = '';
  ELEMENTS.forEach(elem => {
    const cfg  = ELEM[elem];
    const item = document.createElement('div');
    item.className = 'energy-item';
    item.id = `ei-${elem}`;
    item.innerHTML = `
      <div class="energy-label">
        <span class="energy-toa" id="et-${elem}">${cfg.toa}</span>
        <span id="ev-${elem}">0</span>
      </div>
      <div class="energy-track">
        <div class="energy-fill ${cfg.cls}" id="ef-${elem}"></div>
      </div>
      <button class="skill-btn ${cfg.cls}" id="sb-${elem}">${ABILITY_BTN_TEXT[elem]}</button>`;
    item.addEventListener('click', () => {
      if (!isAnimating && energy[elem] >= ENERGY_MAX) triggerAbility(elem);
    });
    panel.appendChild(item);
  });
}

function updateEnergyUI() {
  ELEMENTS.forEach(elem => {
    const pct  = Math.min(100, (energy[elem] / ENERGY_MAX) * 100);
    const fill = document.getElementById(`ef-${elem}`);
    const item = document.getElementById(`ei-${elem}`);
    fill.style.width = `${pct}%`;
    document.getElementById(`ev-${elem}`).textContent = Math.floor(energy[elem]);
    const full = energy[elem] >= ENERGY_MAX;
    fill.classList.toggle('energy-full', full);
    item.classList.toggle('ability-ready', full);
    const btn = document.getElementById(`sb-${elem}`);
    if (btn) btn.classList.toggle('ready', full);
  });
}

function updateBossHpUI() {
  if (multiBossTargets) {
    multiBossTargets.forEach(t => {
      const pct  = t.maxHp > 0 ? Math.max(0, (t.hp / t.maxHp) * 100) : 0;
      const fill = document.getElementById(`mb-fill-${t.id}`);
      const hpEl = document.getElementById(`mb-hp-${t.id}`);
      const row  = document.getElementById(`mb-row-${t.id}`);
      if (fill) fill.style.width = `${pct}%`;
      if (hpEl) hpEl.textContent = Math.max(0, t.hp);
      if (row)  row.classList.toggle('mb-defeated', t.hp <= 0);
    });
    bossHp = multiBossTargets.reduce((s, t) => s + t.hp, 0);
    return;
  }
  const pct = Math.max(0, (bossHp / bossMaxHp) * 100);
  document.getElementById('boss-hp-bar').style.width  = `${pct}%`;
  document.getElementById('boss-hp-text').textContent = `${Math.max(0, bossHp)} / ${bossMaxHp}`;
}

function renderMultiBossPanel() {
  // Portrait already handled in loadLevel; just hide the single-boss HP elements
  document.getElementById('boss-hp-text').classList.add('hidden');
  document.getElementById('boss-hp-track').classList.add('hidden');
  document.getElementById('boss-shield-info').classList.add('hidden');

  const existing = document.getElementById('multiboss-bars');
  if (existing) existing.remove();

  const bars = document.createElement('div');
  bars.id = 'multiboss-bars';
  bars.innerHTML = multiBossTargets.map(t => {
    const badgesHtml = t.elems.length > 1
      ? `<div class="mb-elems">${t.elems.map(e =>
          `<span class="mb-elem-badge ${ELEM[e].cls}">${ELEM[e].label}</span>`).join('')}</div>`
      : '';
    return `
    <div class="mb-row" id="mb-row-${t.id}">
      <div class="mb-info">
        <span class="mb-label ${ELEM[t.colorElem].cls}">${t.name}</span>
        ${badgesHtml}
      </div>
      <div class="mb-track">
        <div class="mb-fill ${ELEM[t.colorElem].cls}" id="mb-fill-${t.id}" style="width:100%"></div>
      </div>
      <span class="mb-hp" id="mb-hp-${t.id}">${t.maxHp}</span>
    </div>`;
  }).join('');
  document.getElementById('boss-details').appendChild(bars);
}

function restoreSingleBossPanel() {
  const existing = document.getElementById('multiboss-bars');
  if (existing) existing.remove();
  document.getElementById('boss-hp-text').classList.remove('hidden');
  document.getElementById('boss-hp-track').classList.remove('hidden');
}

// ── Input ──────────────────────────────────────────────────────────
function onCellClick(r, c) {
  if (isAnimating) return;

  if (!selected) {
    selected = { r, c };
    cellEl(r, c).classList.add('selected');
    return;
  }

  const { r: sr, c: sc } = selected;
  cellEl(sr, sc).classList.remove('selected');
  selected = null;

  if (sr === r && sc === c) return;

  if (Math.abs(sr - r) + Math.abs(sc - c) === 1) {
    combo = 0;
    attemptSwap(sr, sc, r, c);
  } else {
    selected = { r, c };
    cellEl(r, c).classList.add('selected');
  }
}

// ── Swap ───────────────────────────────────────────────────────────
function swap(r1, c1, r2, c2) {
  [board[r1][c1], board[r2][c2]] = [board[r2][c2], board[r1][c1]];
}

function tickTurnCounters() {
  for (const [key, dur] of infectedCells) {
    if (dur <= 1) infectedCells.delete(key);
    else infectedCells.set(key, dur - 1);
  }
  bossAttackCountdown--;
  if (bossAttackCountdown <= 0) {
    bossAttackCountdown = level.boss.attackInterval ?? 6;
    pendingCounterattack = true;
  }
  if (damageBuffTurns > 0) {
    damageBuffTurns--;
    if (damageBuffTurns === 0) damageBuffMult = 1;
  }
}

function attemptSwap(r1, c1, r2, c2) {
  swap(r1, c1, r2, c2);

  // ── Bomb-on-move: any swap involving a bomb detonates it immediately ──
  const bomb1 = isBomb(board[r1][c1]); // what landed at r1,c1 (came from r2,c2)
  const bomb2 = isBomb(board[r2][c2]); // what landed at r2,c2 (came from r1,c1)
  if (bomb1 || bomb2) {
    tickTurnCounters();
    refreshCell(r1, c1);
    refreshCell(r2, c2);
    const bombMatches = [];
    if (bomb1) bombMatches.push({ r: r1, c: c1 });
    if (bomb2) bombMatches.push({ r: r2, c: c2 });
    combo = 0;
    isAnimating = true;
    setTimeout(() => processMatches(bombMatches, 0, null, null), 160);
    return;
  }

  // ── Normal flow ────────────────────────────────────────────────
  const { cells: matches, maxRun, bombPos, lBombPos } = findMatches();

  if (!matches.length) {
    swap(r1, c1, r2, c2);
    cellEl(r1, c1).style.animation = 'shake 0.3s ease';
    setTimeout(() => { cellEl(r1, c1).style.animation = ''; }, 350);
    return;
  }

  tickTurnCounters();
  refreshCell(r1, c1);
  refreshCell(r2, c2);

  isAnimating = true;
  setTimeout(() => processMatches(matches, maxRun, bombPos, lBombPos), 160);
}

// ── Match finding ──────────────────────────────────────────────────
// Returns { cells, maxRun, bombPos, lBombPos }
// bombPos  = center of longest straight run ≥4 (4+ bomb placement)
// lBombPos = corner of an L/T shape (3+3 bomb placement, lower priority)
function findMatches() {
  const hit  = new Set();
  const hRun = new Set(); // cells in any horizontal 3+ run
  const vRun = new Set(); // cells in any vertical   3+ run
  let maxRun = 0;
  let bombPos = null;

  // Horizontal runs
  for (let r = 0; r < ROWS; r++) {
    let run = 1;
    for (let c = 1; c <= COLS; c++) {
      const match = c < COLS
        && board[r][c] !== null
        && getElem(board[r][c]) === getElem(board[r][c - 1]);
      if (match) {
        run++;
      } else {
        if (run >= 3) {
          const start = c - run;
          for (let k = start; k < c; k++) { hit.add(r * COLS + k); hRun.add(r * COLS + k); }
          if (run > maxRun) {
            maxRun = run;
            bombPos = { r, c: start + Math.floor(run / 2), elem: getElem(board[r][start]) };
          }
        }
        run = 1;
      }
    }
  }

  // Vertical runs
  for (let c = 0; c < COLS; c++) {
    let run = 1;
    for (let r = 1; r <= ROWS; r++) {
      const match = r < ROWS
        && board[r][c] !== null
        && getElem(board[r][c]) === getElem(board[r - 1][c]);
      if (match) {
        run++;
      } else {
        if (run >= 3) {
          const start = r - run;
          for (let k = start; k < r; k++) { hit.add(k * COLS + c); vRun.add(k * COLS + c); }
          if (run > maxRun) {
            maxRun = run;
            bombPos = { r: start + Math.floor(run / 2), c, elem: getElem(board[start][c]) };
          }
        }
        run = 1;
      }
    }
  }

  // L / T intersections: a cell in both a horizontal and a vertical 3+ run
  let lBombPos = null;
  for (const key of hRun) {
    if (vRun.has(key)) {
      const r = Math.floor(key / COLS), c = key % COLS;
      lBombPos = { r, c, elem: getElem(board[r][c]) };
      break; // first found is enough
    }
  }

  const cells = [...hit].map(idx => ({ r: Math.floor(idx / COLS), c: idx % COLS }));
  return { cells, maxRun, bombPos, lBombPos };
}

// ── Bomb explosion patterns ────────────────────────────────────────
// Returns a Set of flat indices (r*COLS+c) to clear for each element type
function getBombExplosion(r, c, elem) {
  const pos = new Set();
  switch (elem) {
    case 'fire':
      // Cross: full row + full column
      for (let c2 = 0; c2 < COLS; c2++) pos.add(r  * COLS + c2);
      for (let r2 = 0; r2 < ROWS; r2++) pos.add(r2 * COLS + c);
      break;
    case 'water':
      // 3-row horizontal sweep (row-1, row, row+1)
      for (let dr = -1; dr <= 1; dr++) {
        const nr = r + dr;
        if (nr >= 0 && nr < ROWS)
          for (let c2 = 0; c2 < COLS; c2++) pos.add(nr * COLS + c2);
      }
      break;
    case 'earth':
      // 3-column vertical sweep (col-1, col, col+1)
      for (let dc = -1; dc <= 1; dc++) {
        const nc = c + dc;
        if (nc >= 0 && nc < COLS)
          for (let r2 = 0; r2 < ROWS; r2++) pos.add(r2 * COLS + nc);
      }
      break;
    case 'ice':
      // Diamond: Manhattan distance ≤ 2
      for (let r2 = 0; r2 < ROWS; r2++)
        for (let c2 = 0; c2 < COLS; c2++)
          if (Math.abs(r2 - r) + Math.abs(c2 - c) <= 2) pos.add(r2 * COLS + c2);
      break;
    case 'air':
      // Whirlwind: all tiles of the same element on the board
      for (let r2 = 0; r2 < ROWS; r2++)
        for (let c2 = 0; c2 < COLS; c2++)
          if (getElem(board[r2][c2]) === 'air') pos.add(r2 * COLS + c2);
      break;
    case 'stone':
      // 5×5 area
      for (let dr = -2; dr <= 2; dr++)
        for (let dc = -2; dc <= 2; dc++) {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) pos.add(nr * COLS + nc);
        }
      break;
    default:
      // Fallback: 3×3
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) pos.add(nr * COLS + nc);
        }
  }
  return pos;
}

// ── Particle burst ─────────────────────────────────────────────────
function spawnParticles(matches, color = null) {
  matches.forEach(({ r, c }) => {
    const el = cellEl(r, c);
    if (!el) return;
    const rect   = el.getBoundingClientRect();
    const cx     = rect.left + rect.width  / 2;
    const cy     = rect.top  + rect.height / 2;
    const tile   = board[r][c];
    const clr    = color ?? ELEM_COLOR[getElem(tile)] ?? '#ffffff';
    const count  = isBomb(tile) ? 10 : 6;

    for (let i = 0; i < count; i++) {
      const p     = document.createElement('div');
      p.className = 'particle';
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const dist  = isBomb(tile) ? (40 + Math.random() * 40) : (26 + Math.random() * 28);
      p.style.cssText = `left:${cx}px;top:${cy}px;background:${clr};` +
        `--dx:${(Math.cos(angle) * dist).toFixed(1)}px;` +
        `--dy:${(Math.sin(angle) * dist).toFixed(1)}px;`;
      document.body.appendChild(p);
      p.addEventListener('animationend', () => p.remove());
    }
  });
}

// ── Processing chain ───────────────────────────────────────────────
async function processMatches(matches, maxRun = 3, bombPos = null, lBombPos = null) {
  combo++;

  // ── Detect + chain bomb explosions (BFS) ──────────────────────
  const matchKeys       = new Set(matches.map(({ r, c }) => r * COLS + c));
  const explodedKeys    = new Set();
  const explodingBombElems = [];
  const explosionSet    = new Set();
  const bombQueue       = matches.filter(({ r, c }) => board[r][c] && isBomb(board[r][c]));

  while (bombQueue.length > 0) {
    const { r, c } = bombQueue.shift();
    const key = r * COLS + c;
    if (explodedKeys.has(key)) continue;
    explodedKeys.add(key);
    explodingBombElems.push(getElem(board[r][c]));
    getBombExplosion(r, c, getElem(board[r][c])).forEach(k => {
      explosionSet.add(k);
      // Chain: if explosion hits another unexploded bomb, queue it
      const br = Math.floor(k / COLS), bc = k % COLS;
      if (board[br][bc] && isBomb(board[br][bc]) && !explodedKeys.has(k))
        bombQueue.push({ r: br, c: bc });
    });
  }

  const explosionExtra = [...explosionSet]
    .filter(k => !matchKeys.has(k))
    .map(k => ({ r: Math.floor(k / COLS), c: k % COLS }));
  const allCleared = [...matches, ...explosionExtra];

  // ── Animate removal ────────────────────────────────────────────
  spawnParticles(matches);
  if (explosionExtra.length) spawnParticles(explosionExtra, '#f0d050');

  matches.forEach(({ r, c }) => {
    const el = cellEl(r, c);
    if (!el) return;
    el.classList.add(isBomb(board[r][c]) ? 'bomb-exploding' : 'removing');
  });
  explosionExtra.forEach(({ r, c }) => {
    cellEl(r, c)?.classList.add('bomb-exploding');
  });

  await wait(explosionExtra.length ? 420 : 280);

  // ── Tally elements ─────────────────────────────────────────────
  const counts = {};
  allCleared.forEach(({ r, c }) => {
    const e = getElem(board[r][c]);
    if (e) counts[e] = (counts[e] || 0) + 1;
  });

  // ── Damage calculation ─────────────────────────────────────────
  let bigMult = 1;
  if (maxRun >= 5)      bigMult = 2.5;
  else if (maxRun >= 4) bigMult = 1.5;
  // Chain bomb bonus: +50% per bomb, capped at ×3
  if (explodingBombElems.length > 0)
    bigMult *= Math.min(3, 1 + 0.5 * explodingBombElems.length);

  const comboMult = level.damage.comboMultiplier ? 1 + (combo - 1) * 0.5 : 1;

  // ── Shield / multi-boss / seal routing ────────────────────────
  let damage = 0;
  if (multiBossTargets) {
    // Each element's tiles only damage their own target
    Object.entries(counts).forEach(([e, n]) => {
      const tgt = multiBossTargets.find(t => t.elems.includes(e));
      if (!tgt || tgt.hp <= 0) return;
      const d = Math.round(n * level.damage.perTile * comboMult * bigMult * damageBuffMult);
      tgt.hp = Math.max(0, tgt.hp - d);
      damage += d;
    });
  } else if (sealSystem && sealActive) {
    // Seal phase: boss is fully immune; count only the seal element's tiles
    sealTilesCleared += (counts[SEAL_ORDER[sealPhase]] || 0);
    // damage stays 0
  } else {
    damage = Math.round(allCleared.length * level.damage.perTile * comboMult * bigMult * damageBuffMult);
    if (shieldActive && level.boss.shield) {
      if (counts[level.boss.shield]) {
        shieldActive = false;
        document.getElementById('boss-shield-info').classList.add('hidden');
      } else {
        damage = 0;
      }
    }
    // Seal system: clamp damage so HP doesn't drop below the next threshold
    if (sealSystem && sealPhase < SEAL_THRESHOLDS.length) {
      const threshold = SEAL_THRESHOLDS[sealPhase];
      if (bossHp - damage < threshold) {
        damage = Math.max(0, bossHp - threshold);
      }
    }
  }

  // ── Energy gain ────────────────────────────────────────────────
  Object.entries(counts).forEach(([e, n]) => {
    energy[e] = Math.min(ENERGY_MAX, energy[e] + n * 10);
  });
  updateEnergyUI();

  // ── Apply damage ───────────────────────────────────────────────
  if (damage > 0) {
    if (!multiBossTargets) bossHp = Math.max(0, bossHp - damage);
    updateBossHpUI();
    shakeBossPanel();
  }

  // ── Banner ─────────────────────────────────────────────────────
  if (explodingBombElems.length || combo > 1 || maxRun >= 4 || lBombPos) {
    showComboBanner(combo, damage, maxRun, explodingBombElems[0] ?? null, explodingBombElems.length);
  }

  // ── Clear board positions ──────────────────────────────────────
  allCleared.forEach(({ r, c }) => {
    board[r][c] = null;
    infectedCells.delete(r * COLS + c);
  });

  // ── Place bomb for 4+ run OR L/T shape ────────────────────────
  if (maxRun >= 4 && bombPos && board[bombPos.r][bombPos.c] === null) {
    board[bombPos.r][bombPos.c] = `bomb-${bombPos.elem}`;
  } else if (lBombPos && board[lBombPos.r][lBombPos.c] === null) {
    board[lBombPos.r][lBombPos.c] = `bomb-${lBombPos.elem}`;
  }

  // ── Gravity + refill ───────────────────────────────────────────
  const newTiles = applyGravity();
  refill(newTiles);

  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      refreshCell(r, c, newTiles.has(r * COLS + c));

  await wait(240);

  // ── Seal system checks ─────────────────────────────────────────
  if (sealSystem && !multiBossTargets) {
    // Seal break: enough tiles of the seal element were cleared this match
    if (sealActive && sealTilesCleared >= SEAL_TILES_NEEDED) {
      await breakSeal();
    } else if (sealActive) {
      updateSealUI(); // just refresh the progress bar
    }
    // Seal activation: damage just pushed HP to (or below) the next threshold
    if (!sealActive && sealPhase < SEAL_ORDER.length && bossHp <= SEAL_THRESHOLDS[sealPhase]) {
      bossHp = SEAL_THRESHOLDS[sealPhase];
      updateBossHpUI();
      await activateSeal();
      isAnimating = false;
      combo = 0;
      return; // wait for player to clear the seal
    }
  }

  // ── Victory / Finale check ─────────────────────────────────────
  if (bossHp <= 0) {
    isAnimating = false;
    if (sealSystem) await finaleAllSix();
    else            showVictory();
    return;
  }

  // ── Chain check ────────────────────────────────────────────────
  const { cells: next, maxRun: nextRun, bombPos: nextBombPos, lBombPos: nextLBombPos } = findMatches();
  if (next.length) {
    setTimeout(() => processMatches(next, nextRun, nextBombPos, nextLBombPos), 80);
  } else {
    if (pendingCounterattack && bossHp > 0) {
      pendingCounterattack = false;
      await bossCounterattack();
    }
    isAnimating = false;
    combo = 0;
  }
}

function applyGravity() {
  for (let c = 0; c < COLS; c++) {
    let write = ROWS - 1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r][c] !== null) {
        board[write][c] = board[r][c];
        if (write !== r) board[r][c] = null;
        write--;
      }
    }
    for (let r = write; r >= 0; r--) board[r][c] = null;
  }

  const newSlots = new Set();
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (board[r][c] === null) newSlots.add(r * COLS + c);
  return newSlots;
}

function refill(nullSlots) {
  // Only fill with normal elements, never bombs
  nullSlots.forEach(idx => {
    board[Math.floor(idx / COLS)][idx % COLS] = randomElem();
  });
}

// ── Effects ────────────────────────────────────────────────────────
function shakeBossPanel() {
  const panel = document.getElementById('boss-panel');
  panel.classList.remove('boss-shake');
  void panel.offsetWidth;
  panel.classList.add('boss-shake');
  setTimeout(() => panel.classList.remove('boss-shake'), 400);

  const portrait = document.getElementById('boss-portrait');
  if (!portrait.classList.contains('hidden')) {
    portrait.classList.remove('boss-hit-flash');
    void portrait.offsetWidth;
    portrait.classList.add('boss-hit-flash');
    setTimeout(() => portrait.classList.remove('boss-hit-flash'), 400);
  }
}

const BOMB_BANNER = {
  fire:  '🔥 烈焰十字',
  water: '🌊 海浪橫掃',
  earth: '🪨 地盤縱裂',
  ice:   '❄️ 冰晶爆散',
  air:   '🌪️ 旋風清場',
  stone: '💥 巨石落擊',
};

function showComboBanner(n, dmg, maxRun, bombElem = null, bombCount = 0) {
  const banner  = document.getElementById('combo-banner');
  const dmgText = dmg > 0 ? `${dmg} 傷害` :
                  multiBossTargets ? '無效元素' :
                  (sealSystem && sealActive) ? `封印：${sealTilesCleared}/${SEAL_TILES_NEEDED}` :
                  '護盾阻擋';
  let text, extraClass;

  if (bombCount >= 2) {
    text       = `💥×${bombCount} 連鎖引爆！  ${dmgText}`;
    extraClass = 'amazing';
  } else if (bombElem) {
    text      = `${BOMB_BANNER[bombElem] ?? '💥 符文引爆'}！  ${dmgText}`;
    extraClass = 'amazing';
  } else if (maxRun >= 5) {
    text      = `★★ AMAZING ${maxRun}連！  ${dmgText}`;
    extraClass = 'amazing';
  } else if (maxRun >= 4) {
    text      = `★ GREAT ${maxRun}連！  ${dmgText}`;
    extraClass = 'great';
  } else {
    text      = `${n} COMBO！  ${dmgText}`;
    extraClass = '';
  }

  banner.textContent     = text;
  banner.className       = extraClass;
  banner.style.animation = 'none';
  void banner.offsetWidth;
  banner.style.animation = '';
  setTimeout(() => banner.classList.add('hidden'), 1000);
}

// ── Boss counterattack ─────────────────────────────────────────────
async function bossCounterattack() {
  if (bossHp <= 0) return;

  const overlay  = document.getElementById('boss-attack-overlay');
  const portrait = document.getElementById('boss-portrait');

  overlay.classList.remove('hidden');
  overlay.style.animation = 'none';
  void overlay.offsetWidth;
  overlay.style.animation = '';

  if (!portrait.classList.contains('hidden')) {
    portrait.classList.remove('boss-attacking');
    void portrait.offsetWidth;
    portrait.classList.add('boss-attacking');
    setTimeout(() => portrait.classList.remove('boss-attacking'), 1200);
  }

  // Infect 4–5 random positions for 3 swaps
  const count = 4 + Math.floor(Math.random() * 2);
  const keys  = Array.from({ length: ROWS * COLS }, (_, i) => i);
  for (let i = keys.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [keys[i], keys[j]] = [keys[j], keys[i]];
  }
  keys.slice(0, count).forEach(k => infectedCells.set(k, 3));

  await wait(1200);
  overlay.classList.add('hidden');

  for (const key of infectedCells.keys())
    refreshCell(Math.floor(key / COLS), key % COLS);
}

// ── Fisher-Yates shuffle ───────────────────────────────────────────
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ── Shared ability helpers ─────────────────────────────────────────
function showAbilityBanner(text) {
  const banner = document.getElementById('combo-banner');
  banner.textContent     = text;
  banner.className       = 'amazing';
  banner.style.animation = 'none';
  void banner.offsetWidth;
  banner.style.animation = '';
  setTimeout(() => banner.classList.add('hidden'), 1400);
}

async function clearAbilityTargets(positions) {
  positions.forEach(({ r, c }) => cellEl(r, c)?.classList.add('removing'));
  await wait(320);
  positions.forEach(({ r, c }) => {
    board[r][c] = null;
    infectedCells.delete(r * COLS + c);
  });
}

async function finishTurn() {
  const newTiles = applyGravity();
  refill(newTiles);
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      refreshCell(r, c, newTiles.has(r * COLS + c));
  await wait(260);

  // Seal checks (ability might have contributed to seal or crossed a threshold)
  if (sealSystem && !multiBossTargets) {
    if (sealActive && sealTilesCleared >= SEAL_TILES_NEEDED) {
      await breakSeal();
    }
    if (!sealActive && sealPhase < SEAL_ORDER.length && bossHp <= SEAL_THRESHOLDS[sealPhase]) {
      bossHp = SEAL_THRESHOLDS[sealPhase];
      updateBossHpUI();
      await activateSeal();
      isAnimating = false;
      combo = 0;
      return;
    }
  }

  if (bossHp <= 0) {
    isAnimating = false;
    if (sealSystem) await finaleAllSix();
    else            showVictory();
    return;
  }

  const { cells: next, maxRun, bombPos, lBombPos } = findMatches();
  if (next.length) {
    combo = 0;
    setTimeout(() => processMatches(next, maxRun, bombPos, lBombPos), 80);
  } else {
    if (pendingCounterattack && bossHp > 0) {
      pendingCounterattack = false;
      await bossCounterattack();
    }
    isAnimating = false;
    combo = 0;
  }
}

function abilityFlashFX(elem) {
  const flash = document.createElement('div');
  flash.className        = 'ability-flash';
  flash.style.background = ELEM_COLOR[elem] ?? '#fff';
  document.body.appendChild(flash);
  flash.addEventListener('animationend', () => flash.remove());
}

function applyShieldLogic(elem, rawDamage) {
  if (!shieldActive || !level.boss.shield) return rawDamage;
  if (level.boss.shield === elem) {
    shieldActive = false;
    document.getElementById('boss-shield-info').classList.add('hidden');
    return rawDamage;
  }
  return 0;
}

// ── Toa energy ability dispatcher ─────────────────────────────────
async function triggerAbility(elem) {
  if (isAnimating) return;
  isAnimating = true;
  energy[elem] = 0;
  updateEnergyUI();
  abilityFlashFX(elem);

  switch (elem) {
    case 'fire':  await abilityFire();  break;
    case 'water': await abilityWater(); break;
    case 'earth': await abilityEarth(); break;
    case 'ice':   await abilityIce();   break;
    case 'air':   await abilityAir();   break;
    case 'stone': await abilityStone(); break;
  }
}

// 🔥 塔胡：在盤面上隨機放置 5 個火焰炸彈
async function abilityFire() {
  const eligible = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (!isBomb(board[r][c])) eligible.push({ r, c });
  shuffle(eligible);
  const count = Math.min(5, eligible.length);
  for (let i = 0; i < count; i++) {
    const { r, c } = eligible[i];
    board[r][c] = 'bomb-fire';
    refreshCell(r, c);
  }
  showAbilityBanner(`🔥 塔胡 烈焰引信！  ${count} 個火焰炸彈已埋入！`);
  await wait(500);
  isAnimating = false;
}

// 🌊 加利：清除底部第一排全部 + 第二排奇數格（col 0,2,4,6）
async function abilityWater() {
  const targets = [];
  for (let c = 0; c < COLS; c++)    targets.push({ r: ROWS - 1, c });
  for (let c = 0; c < COLS; c += 2) targets.push({ r: ROWS - 2, c });

  // Count elements BEFORE board is cleared (for multiboss routing)
  const preCounts = {};
  targets.forEach(({ r, c }) => {
    const e = getElem(board[r][c]);
    if (e) preCounts[e] = (preCounts[e] || 0) + 1;
  });

  spawnParticles(targets, ELEM_COLOR.water);
  await clearAbilityTargets(targets);

  let damage = 0;
  if (multiBossTargets) {
    Object.entries(preCounts).forEach(([e, n]) => {
      const tgt = multiBossTargets.find(t => t.elems.includes(e));
      if (!tgt || tgt.hp <= 0) return;
      const d = Math.round(n * level.damage.perTile * 2 * damageBuffMult);
      tgt.hp = Math.max(0, tgt.hp - d);
      damage += d;
    });
    if (damage > 0) { updateBossHpUI(); shakeBossPanel(); }
    showAbilityBanner(`🌊 加利 海浪橫掃！  ${damage > 0 ? damage + ' 傷害' : '無效元素'}`);
  } else if (sealSystem && sealActive) {
    // Tiles cleared by ability count toward seal progress
    sealTilesCleared += (preCounts[SEAL_ORDER[sealPhase]] || 0);
    updateSealUI();
    showAbilityBanner(`🌊 加利 海浪橫掃！  封印：${sealTilesCleared}/${SEAL_TILES_NEEDED}`);
  } else {
    damage = applyShieldLogic('water',
      Math.round(targets.length * level.damage.perTile * 2 * damageBuffMult));
    if (damage > 0) { bossHp = Math.max(0, bossHp - damage); updateBossHpUI(); shakeBossPanel(); }
    showAbilityBanner(`🌊 加利 海浪橫掃！  ${damage > 0 ? damage + ' 傷害' : '護盾阻擋'}`);
  }
  await finishTurn();
}

// 🪨 歐努亞：直接造成 Boss 最大 HP 15% 傷害（multiboss：打暗影歐努亞 40%）
async function abilityEarth() {
  let damage = 0;
  if (multiBossTargets) {
    const tgt = multiBossTargets.find(t => t.elems.includes('earth'));
    if (tgt && tgt.hp > 0) {
      damage = Math.round(tgt.maxHp * 0.40 * damageBuffMult);
      tgt.hp = Math.max(0, tgt.hp - damage);
      updateBossHpUI();
      shakeBossPanel();
    }
    showAbilityBanner(`🪨 歐努亞 重拳出擊！  ${damage > 0 ? damage + ' 直接傷害' : '暗影已消滅'}`);
  } else {
    // 重拳是物理直接傷害：穿透封印免疫，也不受門檻限制
    damage = applyShieldLogic('earth', Math.round(bossMaxHp * 0.15 * damageBuffMult));
    if (damage > 0) { bossHp = Math.max(0, bossHp - damage); updateBossHpUI(); shakeBossPanel(); }
    const sealLabel = (sealSystem && sealActive) ? ' 穿透封印！' : ' 直接傷害';
    showAbilityBanner(`🪨 歐努亞 重拳出擊！  ${damage > 0 ? damage + sealLabel : '護盾阻擋'}`);
  }
  await wait(600);
  // Seal activation (might have just crossed a threshold via direct damage)
  if (sealSystem && !multiBossTargets && !sealActive && sealPhase < SEAL_ORDER.length && bossHp <= SEAL_THRESHOLDS[sealPhase]) {
    bossHp = SEAL_THRESHOLDS[sealPhase];
    updateBossHpUI();
    await activateSeal();
    isAnimating = false;
    combo = 0;
    return;
  }
  if (bossHp <= 0) {
    isAnimating = false;
    if (sealSystem) await finaleAllSix();
    else            showVictory();
    return;
  }
  if (pendingCounterattack) { pendingCounterattack = false; await bossCounterattack(); }
  isAnimating = false;
  combo = 0;
}

// ❄️ 科帕卡：接下來 3 回合傷害 ×2
async function abilityIce() {
  damageBuffMult  = 2;
  damageBuffTurns = 3;
  showAbilityBanner(`❄️ 科帕卡 冰封強化！  接下來 3 回合傷害 ×2`);
  await wait(600);
  isAnimating = false;
}

// 🌪️ 列瓦：洗牌整個盤面，清除所有感染格
async function abilityAir() {
  const flat = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      flat.push(board[r][c]);
  shuffle(flat);
  let idx = 0;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      board[r][c] = flat[idx++];
  infectedCells.clear();
  showAbilityBanner(`🌪️ 列瓦 旋風洗牌！  感染清除`);
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      refreshCell(r, c, true);
  await wait(300);
  const { cells: next, maxRun, bombPos, lBombPos } = findMatches();
  if (next.length) {
    combo = 0;
    setTimeout(() => processMatches(next, maxRun, bombPos, lBombPos), 80);
  } else {
    if (pendingCounterattack && bossHp > 0) { pendingCounterattack = false; await bossCounterattack(); }
    isAnimating = false;
    combo = 0;
  }
}

// 💥 波哈圖：3 個隨機位置 3×3 爆炸
async function abilityStone() {
  const positions = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      positions.push({ r, c });
  shuffle(positions);
  const centers = positions.slice(0, 3);

  const blastSet = new Set();
  centers.forEach(({ r, c }) => {
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS)
          blastSet.add(nr * COLS + nc);
      }
  });
  const targets = [...blastSet].map(k => ({ r: Math.floor(k / COLS), c: k % COLS }));

  // Count elements BEFORE board is cleared (for multiboss routing)
  const preCounts = {};
  targets.forEach(({ r, c }) => {
    const e = getElem(board[r][c]);
    if (e) preCounts[e] = (preCounts[e] || 0) + 1;
  });

  spawnParticles(targets, ELEM_COLOR.stone);
  await clearAbilityTargets(targets);

  let damage = 0;
  if (multiBossTargets) {
    Object.entries(preCounts).forEach(([e, n]) => {
      const tgt = multiBossTargets.find(t => t.elems.includes(e));
      if (!tgt || tgt.hp <= 0) return;
      const d = Math.round(n * level.damage.perTile * 2.5 * damageBuffMult);
      tgt.hp = Math.max(0, tgt.hp - d);
      damage += d;
    });
    if (damage > 0) { updateBossHpUI(); shakeBossPanel(); }
    showAbilityBanner(`💥 波哈圖 投石轟炸！  ${damage > 0 ? damage + ' 傷害' : '無效元素'}`);
  } else if (sealSystem && sealActive) {
    // Tiles cleared by ability count toward seal progress
    sealTilesCleared += (preCounts[SEAL_ORDER[sealPhase]] || 0);
    updateSealUI();
    showAbilityBanner(`💥 波哈圖 投石轟炸！  封印：${sealTilesCleared}/${SEAL_TILES_NEEDED}`);
  } else {
    damage = applyShieldLogic('stone',
      Math.round(targets.length * level.damage.perTile * 2.5 * damageBuffMult));
    if (damage > 0) { bossHp = Math.max(0, bossHp - damage); updateBossHpUI(); shakeBossPanel(); }
    showAbilityBanner(`💥 波哈圖 投石轟炸！  ${damage > 0 ? damage + ' 傷害' : '護盾阻擋'}`);
  }
  await finishTurn();
}

// ── Seal system (Level 12) ─────────────────────────────────────────

async function activateSeal() {
  sealActive       = true;
  sealTilesCleared = 0;
  const elem = SEAL_ORDER[sealPhase];
  const cfg  = ELEM[elem];

  // Tinted overlay flash
  const overlay = document.getElementById('boss-attack-overlay');
  overlay.style.background = `radial-gradient(ellipse at center, ${ELEM_COLOR[elem]}44 0%, transparent 70%)`;
  overlay.classList.remove('hidden');
  overlay.style.animation = 'none';
  void overlay.offsetWidth;
  overlay.style.animation = '';

  // Reveal the seal progress bar in the boss panel
  const sealInfo = document.getElementById('seal-info');
  sealInfo.style.setProperty('--ec', ELEM_COLOR[elem]);
  document.getElementById('seal-label').textContent = `⛓️ ${cfg.label}封印`;
  document.getElementById('seal-count').textContent = `0 / ${SEAL_TILES_NEEDED}`;
  document.getElementById('seal-bar').style.width   = '0%';
  sealInfo.classList.remove('hidden');

  showAbilityBanner(`⛓️ 馬古他封印！清除 ${SEAL_TILES_NEEDED} 個${cfg.label}格才能繼續攻擊！`);

  await wait(1800);
  overlay.classList.add('hidden');
  overlay.style.background = '';
}

function updateSealUI() {
  if (!sealActive) return;
  const pct = Math.min(100, (sealTilesCleared / SEAL_TILES_NEEDED) * 100);
  document.getElementById('seal-bar').style.width   = `${pct}%`;
  document.getElementById('seal-count').textContent = `${sealTilesCleared} / ${SEAL_TILES_NEEDED}`;
}

async function breakSeal() {
  sealActive = false;
  const elem = SEAL_ORDER[sealPhase];
  const cfg  = ELEM[elem];

  // Hide seal progress bar
  document.getElementById('seal-info').classList.add('hidden');

  // Flash in the element's colour
  abilityFlashFX(elem);

  // Victory banner for this Toa
  showAbilityBanner(`✨ ${cfg.toa} 破除${cfg.label}封印！光之力量！`);

  await wait(1100);

  // Advance to the next seal phase; HP stays where it is
  sealPhase++;
}

async function finaleAllSix() {
  isAnimating = true;

  // Dark overlay for drama
  const overlay = document.getElementById('boss-attack-overlay');
  overlay.style.background = 'rgba(0,0,0,0.88)';
  overlay.classList.remove('hidden');
  overlay.style.animation = 'none';
  void overlay.offsetWidth;
  overlay.style.animation = '';

  showAbilityBanner('★ 六托亞 合力決勝！★');
  await wait(700);

  // Rapid sequential ability flashes — manage banner directly to avoid auto-hide overlap
  const fBanner = document.getElementById('combo-banner');
  const sequence = [
    { elem: 'fire',  text: '🔥 塔胡  — 烈焰！'   },
    { elem: 'ice',   text: '❄️ 科帕卡 — 冰霜！' },
    { elem: 'water', text: '🌊 加利  — 海浪！'   },
    { elem: 'air',   text: '🌪️ 列瓦  — 旋風！'   },
    { elem: 'earth', text: '🪨 歐努亞 — 大地！' },
    { elem: 'stone', text: '💥 波哈圖 — 碎石！' },
  ];

  for (const { elem, text } of sequence) {
    abilityFlashFX(elem);
    fBanner.textContent = text;
    fBanner.className   = 'amazing';
    fBanner.style.animation = 'none';
    void fBanner.offsetWidth;
    fBanner.style.animation = '';
    await wait(360);
  }
  fBanner.classList.add('hidden');

  // Grand finale bright flash
  const flash = document.createElement('div');
  flash.className = 'finale-flash';
  document.body.appendChild(flash);
  flash.addEventListener('animationend', () => flash.remove());

  await wait(1400);

  overlay.classList.add('hidden');
  overlay.style.background = '';

  showVictory();
}

// ── Victory ────────────────────────────────────────────────────────
async function showVictory() {
  isAnimating = true;
  if (level.outro_dialogue?.length) await runDialogue(level.outro_dialogue);
  document.getElementById('victory-msg').textContent =
    level.victory_text ?? `${level.boss.name} 已被擊敗。\n馬托努伊的和平得以延續！`;
  document.getElementById('victory-overlay').classList.remove('hidden');
  isAnimating = false;
}

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Dialogue engine ────────────────────────────────────────────────
async function runDialogue(lines) {
  const overlay  = document.getElementById('dialogue-overlay');
  const portrait = document.getElementById('dialogue-portrait');
  const nameEl   = document.getElementById('dialogue-name');
  const textEl   = document.getElementById('dialogue-text');
  const nextEl   = document.getElementById('dialogue-next');

  overlay.classList.remove('hidden');
  nextEl.style.visibility = 'hidden';

  for (const line of lines) {
    const isNarrator = !line.speaker || line.speaker === 'narrator';
    if (isNarrator) {
      portrait.removeAttribute('src');
      portrait.style.display = 'none';
      nameEl.className = 'narrator-name';
    } else {
      nameEl.className = '';
      const charSrc = await resolveImg(`assets/characters/${line.speaker}`);
      if (charSrc) { portrait.src = charSrc; portrait.style.display = ''; }
      else          { portrait.style.display = 'none'; }
    }
    nameEl.textContent = line.name ?? '';
    textEl.textContent = '';
    nextEl.style.visibility = 'hidden';

    await typewriterLine(textEl, line.text, overlay);
    nextEl.style.visibility = 'visible';
    await waitClick(overlay);
  }

  overlay.classList.add('hidden');
}

function typewriterLine(el, text, skipTarget) {
  return new Promise(resolve => {
    let i = 0, finished = false;
    const tick = setInterval(() => {
      if (i < text.length) { el.textContent += text[i++]; }
      else { clearInterval(tick); finished = true; resolve(); }
    }, 38);
    skipTarget.addEventListener('click', function onSkip() {
      if (!finished) { clearInterval(tick); el.textContent = text; finished = true; resolve(); }
      skipTarget.removeEventListener('click', onSkip);
    }, { once: true });
  });
}

function waitClick(el) {
  return new Promise(resolve => el.addEventListener('click', resolve, { once: true }));
}

// ── Boot ───────────────────────────────────────────────────────────
document.getElementById('next-btn').addEventListener('click', () => {
  document.getElementById('victory-overlay').classList.add('hidden');
  const nextId = level.next_id ?? currentLevelId + 1;
  loadLevel(nextId <= 12 ? nextId : 1);
});

(async () => {
  await preloadImages();
  await loadLevel(1);
})();
