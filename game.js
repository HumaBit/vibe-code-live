/* ═══════════════════════════════════════════════════
   CATCH ME IF YOU CAN — Game Engine
   ═══════════════════════════════════════════════════ */

// ─── AUDIO ───
const audio = {
  ctx: null,
  init() { if (this.ctx) return; this.ctx = new (window.AudioContext || window.webkitAudioContext)(); },
  beep(freq, dur, type = 'square', vol = 0.08) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq; g.gain.value = vol;
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    o.connect(g).connect(this.ctx.destination); o.start(); o.stop(this.ctx.currentTime + dur);
  },
  cast()   { this.beep(200, 0.15, 'sine', 0.1); setTimeout(() => this.beep(300, 0.2, 'sine', 0.06), 100); },
  splash() { this.beep(80, 0.3, 'sawtooth', 0.04); },
  bite()   { this.beep(800, 0.1); this.beep(1000, 0.1); setTimeout(() => this.beep(800, 0.1), 120); },
  reel()   { this.beep(400, 0.08, 'triangle', 0.05); },
  ping()   { this.beep(1200, 0.15, 'sine', 0.03); setTimeout(() => this.beep(900, 0.2, 'sine', 0.02), 100); },
  tug()    { this.beep(150, 0.08, 'sawtooth', 0.04); },
  caught() { [0, 100, 200, 300].forEach((d, i) => setTimeout(() => this.beep(400 + i * 150, 0.15, 'sine', 0.08), d)); },
  miss()   { this.beep(200, 0.3, 'sawtooth', 0.06); setTimeout(() => this.beep(120, 0.4, 'sawtooth', 0.04), 200); },
  record() { [0, 80, 160, 240, 320, 400].forEach((d, i) => setTimeout(() => this.beep(500 + i * 100, 0.12, 'sine', 0.1), d)); },
  streak() { this.beep(600, 0.1, 'sine', 0.06); setTimeout(() => this.beep(800, 0.12, 'sine', 0.06), 80); },
};

// ─── FISH DATABASE ───
const FISH = [
  { name: 'Neon Guppy',     wMin: 0.5, wMax: 3,  rarity: 'COMMON',    color: '#00f0ff', chance: 35 },
  { name: 'Chrome Bass',     wMin: 3,   wMax: 8,  rarity: 'COMMON',    color: '#c0c8d8', chance: 25 },
  { name: 'Plasma Koi',      wMin: 5,   wMax: 15, rarity: 'UNCOMMON',  color: '#ff2a6d', chance: 18 },
  { name: 'Quantum Tuna',    wMin: 12,  wMax: 28, rarity: 'RARE',      color: '#f0e030', chance: 12 },
  { name: 'Holo Marlin',     wMin: 25,  wMax: 55, rarity: 'EPIC',      color: '#05ffa1', chance: 7 },
  { name: 'Void Leviathan',  wMin: 50,  wMax: 99, rarity: 'LEGENDARY', color: '#b026ff', chance: 3 },
];

const FISH_ART = {
  'Neon Guppy':     "     <·411>",
  'Chrome Bass':    "    <·4111}>\n   <=4111}>>\n    <·4111}>",
  'Plasma Koi':     "      /·411}\\\n   <=<41111}>>\n      \\·411}/",
  'Quantum Tuna':   "       /·41111}\\\n    <=<411111111>>\n    <=<411111111>>\n       \\·41111}/",
  'Holo Marlin':    "               /|\n       /·411111/ \n   <=<4111111111>>\n   <=<4111111111>>\n       \\·411111\\ \n               \\|",
  'Void Leviathan': "                   /|\\\n          /·4111111/ |\n     <=<41111111111111>>\n    <=<411111111111111>>>\n     <=<41111111111111>>\n          \\·4111111\\ |\n                   \\|/",
};

const RARITY_COLORS = { COMMON: '#c0c8d8', UNCOMMON: '#ff2a6d', RARE: '#f0e030', EPIC: '#05ffa1', LEGENDARY: '#b026ff' };
const WAIT_MSGS = [
  'Scanning depths...', 'Movement detected below...', 'Something is circling...',
  'Sonar ping...', 'Hold steady...', 'Shadow approaching...', 'Signal flickering...', 'Almost...',
];

// ─── HELPER ───
const $ = id => document.getElementById(id);
const show = (id) => { $(id).classList.add('active'); $(id).classList.remove('hidden'); };
const hide = (id) => { $(id).classList.remove('active'); $(id).classList.add('hidden'); };

// ─── GAME ───
const game = {
  state: 'INSTRUCTIONS',
  casts: 0,
  bestFish: null, bestWeight: 0,
  streak: 0, bestStreak: 0,
  totalWeight: 0, totalCaught: 0,
  journal: [],
  // Reel
  needlePos: 0, needleDir: 1, needleSpeed: 2.5, meterAnim: null,
  // Bite
  biteTimeout: null, biteTimer: null, biteStart: 0,
  // Line
  lineY: 0, targetLineY: 0, hookX: 0,
  // Waiting FX
  bubbles: [], ripples: [], shadowFish: [], sonarRings: [],
  lineTug: 0,
  wBubbleT: 0, wRippleT: 0, wShadowT: 0, wStatusT: 0, wStatusIdx: 0,
  journalOpen: false,

  // ── INSTRUCTIONS ──
  dismissInstructions() {
    audio.init();
    hide('instructions');
    $('title-screen').classList.remove('hidden');
    $('journal-btn').classList.remove('hidden');
    this.state = 'TITLE';
  },

  // ── CAST ──
  cast() {
    audio.init(); audio.cast();
    this.state = 'CASTING'; this.casts++;
    $('cast-count').textContent = this.casts;
    $('title-screen').classList.add('hidden');
    this.showStatus('Casting line...');
    this.hookX = W * 0.5 + (Math.random() - 0.5) * W * 0.3;
    this.targetLineY = H * (0.55 + Math.random() * 0.25);
    this.lineY = H * 0.25;
    this.bubbles = []; this.shadowFish = []; this.sonarRings = []; this.lineTug = 0;
    $('depth-fill').style.height = '0%';

    setTimeout(() => {
      audio.splash();
      this.ripples.push({ x: this.hookX, y: H * 0.45, r: 0, alpha: 0.6 });
      this.state = 'WAITING';
      this.wBubbleT = 0; this.wRippleT = 0; this.wShadowT = 0; this.wStatusT = 0; this.wStatusIdx = 0;
      this.showStatus('Scanning depths...');
      $('depth-fill').style.height = Math.floor(30 + Math.random() * 60) + '%';
      // Bite window: slightly shorter at higher cast counts for tension
      const biteDelay = 2000 + Math.random() * Math.max(2000, 5000 - this.casts * 100);
      this.biteTimeout = setTimeout(() => this.triggerBite(), biteDelay);
    }, 800);
  },

  // ── BITE ──
  triggerBite() {
    audio.bite(); this.state = 'BITE'; this.hideStatus();
    show('bite-alert');
    this.biteStart = Date.now();
    $('bite-timer-fill').style.width = '100%';
    // Bite window shrinks slightly with casts (min 1.4s)
    const biteWindow = Math.max(1400, 2000 - this.casts * 30);
    this.biteTimer = setInterval(() => {
      const pct = Math.max(0, 100 - ((Date.now() - this.biteStart) / biteWindow) * 100);
      $('bite-timer-fill').style.width = pct + '%';
      if (pct <= 0) { clearInterval(this.biteTimer); this.missedBite(); }
    }, 30);
  },

  hookIt() {
    if (this.state !== 'BITE') return;
    clearInterval(this.biteTimer); audio.reel();
    hide('bite-alert');
    this.startReel();
  },

  missedBite() {
    this.state = 'MISSED';
    hide('bite-alert');
    audio.miss();
    this.showResult(null, 0, true);
  },

  // ── REEL ──
  startReel() {
    this.state = 'REELING'; this.needlePos = 0; this.needleDir = 1;
    // Needle gets faster with casts (more skill needed)
    this.needleSpeed = 2 + Math.random() * 2 + Math.min(this.casts * 0.1, 2);
    show('reel-screen');
    const needle = $('needle');
    const mw = $('meter').offsetWidth;
    const animate = () => {
      if (this.state !== 'REELING') return;
      this.needlePos += this.needleDir * this.needleSpeed;
      if (this.needlePos >= 100) { this.needlePos = 100; this.needleDir = -1; }
      if (this.needlePos <= 0) { this.needlePos = 0; this.needleDir = 1; }
      needle.style.left = (this.needlePos / 100 * (mw - 4)) + 'px';
      this.meterAnim = requestAnimationFrame(animate);
    };
    this.meterAnim = requestAnimationFrame(animate);
  },

  lockMeter() {
    if (this.state !== 'REELING') return;
    cancelAnimationFrame(this.meterAnim); this.state = 'LOCKED';
    hide('reel-screen');
    const pos = this.needlePos;
    let zone;
    if (pos >= 35 && pos <= 65) zone = 'perfect';
    else if ((pos >= 20 && pos < 35) || (pos > 65 && pos <= 80)) zone = 'good';
    else zone = 'miss';
    if (zone === 'miss') { audio.miss(); this.showResult(null, 0, false, true); }
    else { audio.caught(); const f = this.rollFish(zone), w = this.rollWeight(f, zone); this.showResult(f, w); }
  },

  // ── FISH ROLL ──
  rollFish(zone) {
    let pool = [];
    FISH.forEach(f => {
      let c = f.chance;
      if (zone === 'perfect') {
        if (f.rarity === 'EPIC' || f.rarity === 'LEGENDARY') c *= 3;
        if (f.rarity === 'RARE') c *= 2;
      }
      // Streak bonus: each streak point adds +1 weight to rare pool
      if (this.streak >= 3 && (f.rarity === 'RARE' || f.rarity === 'EPIC')) c += this.streak;
      if (this.streak >= 5 && f.rarity === 'LEGENDARY') c += Math.floor(this.streak / 2);
      for (let i = 0; i < c; i++) pool.push(f);
    });
    return pool[Math.floor(Math.random() * pool.length)];
  },

  rollWeight(fish, zone) {
    let w = fish.wMin + Math.random() * (fish.wMax - fish.wMin);
    if (zone === 'perfect') w *= 1.1 + Math.random() * 0.2;
    // Streak weight bonus
    if (this.streak >= 2) w *= 1 + this.streak * 0.03;
    return Math.round(Math.min(w, fish.wMax * 1.3) * 10) / 10;
  },

  // ── RESULT ──
  showResult(fish, weight, timedOut = false, badReel = false) {
    const card = $('result-card');
    this.hideStatus(); this.lineY = 0; this.targetLineY = 0;
    $('depth-fill').style.height = '0%';

    if (timedOut || badReel) {
      const hadStreak = this.streak >= 2;
      this.streak = 0;
      this.updateHUD();
      card.innerHTML = `
        <div class="result-miss">GOT AWAY</div>
        <div class="result-miss-sub">${timedOut ? 'Too slow! The fish escaped.' : 'Bad reel — the line snapped!'}</div>
        <div style="font-size:48px;margin:16px 0;filter:grayscale(1) opacity(0.3)">🐟</div>
        ${hadStreak ? '<div class="result-streak-lost">🔥 Streak lost!</div>' : ''}
        <button class="btn-again" onclick="game.reset()">CAST AGAIN</button>`;
    } else {
      this.streak++;
      if (this.streak > this.bestStreak) this.bestStreak = this.streak;
      this.totalWeight += weight;
      this.totalCaught++;
      if (this.streak >= 2) audio.streak();

      const isRecord = weight > this.bestWeight;
      if (isRecord) { this.bestFish = fish; this.bestWeight = weight; this.updateTrophy(); setTimeout(() => audio.record(), 400); }

      // Journal entry
      this.journal.unshift({ name: fish.name, weight, rarity: fish.rarity, color: fish.color, time: new Date().toLocaleTimeString() });
      this.updateJournal();
      this.updateHUD();

      const art = (FISH_ART[fish.name] || '><(((°>').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      card.innerHTML = `
        <div class="result-rarity" style="color:${RARITY_COLORS[fish.rarity]}">${fish.rarity}</div>
        <div class="result-ascii" style="color:${fish.color}">${art}</div>
        <div class="result-name" style="color:${fish.color};text-shadow:0 0 30px ${fish.color}55">${fish.name}</div>
        <div class="result-weight">${weight} kg</div>
        ${this.streak >= 2 ? `<div class="result-streak">🔥 ${this.streak}× Streak!</div>` : ''}
        ${isRecord ? '<div class="result-new-record">★ NEW RECORD ★</div>' : ''}
        <button class="btn-again" onclick="game.reset()">CAST AGAIN</button>`;
    }
    show('result-screen');
  },

  // ── HUD ──
  updateHUD() {
    $('hud-haul').textContent = Math.round(this.totalWeight * 10) / 10 + ' kg';
    const streakEl = $('hud-streak');
    if (this.streak >= 2) {
      streakEl.classList.remove('hidden');
      $('streak-val').textContent = this.streak;
    } else {
      streakEl.classList.add('hidden');
    }
  },

  updateTrophy() {
    $('trophy').classList.remove('hidden');
    $('trophy-name').textContent = this.bestFish.name;
    $('trophy-name').style.color = this.bestFish.color;
    $('trophy-weight').textContent = this.bestWeight + ' kg';
    const r = $('trophy-rarity');
    r.textContent = this.bestFish.rarity; r.style.color = RARITY_COLORS[this.bestFish.rarity];
  },

  // ── JOURNAL ──
  updateJournal() {
    $('journal-count').textContent = this.journal.length;
    $('journal-stats').innerHTML = `
      Caught: <span>${this.totalCaught}</span> · Total: <span>${Math.round(this.totalWeight * 10) / 10} kg</span><br/>
      Best Streak: <span>${this.bestStreak}×</span> · Casts: <span>${this.casts}</span>
    `;
    $('journal-list').innerHTML = this.journal.map(e =>
      `<div class="journal-entry" style="--entry-color:${e.color}">
        <span class="je-name" style="color:${e.color}">${e.name}</span>
        <span class="je-weight">${e.weight} kg</span>
      </div>`
    ).join('');
  },

  toggleJournal() {
    this.journalOpen = !this.journalOpen;
    if (this.journalOpen) { $('journal').classList.remove('hidden'); this.updateJournal(); }
    else { $('journal').classList.add('hidden'); }
  },

  // ── RESET ──
  reset() {
    this.state = 'TITLE';
    hide('result-screen'); hide('bite-alert'); hide('reel-screen');
    $('title-screen').classList.remove('hidden');
    this.hideStatus(); this.lineY = 0; this.targetLineY = 0;
    this.bubbles = []; this.shadowFish = []; this.sonarRings = []; this.lineTug = 0;
  },

  showStatus(t) { const e = $('status'); e.textContent = t; e.classList.add('visible'); },
  hideStatus() { $('status').classList.remove('visible'); },

  // ── WAITING ACTION ──
  updateWaiting(dt) {
    if (this.state !== 'WAITING') return;
    const hx = this.hookX, hy = this.lineY, waterY = H * 0.45;

    // Bubbles
    this.wBubbleT += dt;
    if (this.wBubbleT > 0.1 && hy > waterY) {
      this.wBubbleT = 0;
      this.bubbles.push({
        x: hx + (Math.random() - 0.5) * 30, y: hy + (Math.random() - 0.5) * 10,
        r: 1 + Math.random() * 3, speed: 0.5 + Math.random() * 1.2,
        alpha: 0.3 + Math.random() * 0.4, wobble: Math.random() * 6.28
      });
    }
    this.bubbles = this.bubbles.filter(b => {
      b.y -= b.speed; b.x += Math.sin(b.wobble) * 0.3; b.wobble += 0.08; b.alpha -= 0.004;
      return b.alpha > 0 && b.y > waterY - 5;
    });

    // Sonar pings
    this.wRippleT += dt;
    if (this.wRippleT > 1.2 + Math.random() * 0.8 && hy > waterY) {
      this.wRippleT = 0;
      this.sonarRings.push({ x: hx, y: hy, r: 0, alpha: 0.25 });
      this.ripples.push({ x: hx + (Math.random() - 0.5) * 20, y: waterY, r: 0, alpha: 0.5 });
      audio.ping();
    }
    this.sonarRings = this.sonarRings.filter(s => { s.r += 0.8; s.alpha *= 0.975; return s.alpha > 0.01; });

    // Shadow fish
    this.wShadowT += dt;
    if (this.wShadowT > 1.5 + Math.random() * 2 && this.shadowFish.length < 4) {
      this.wShadowT = 0;
      const fromL = Math.random() > 0.5, sy = hy + (Math.random() - 0.5) * 100;
      if (sy > waterY + 20) {
        this.shadowFish.push({
          x: fromL ? -40 : W + 40, y: sy,
          targetX: hx + (Math.random() - 0.5) * 80,
          speed: 0.6 + Math.random() * 0.8,
          dir: fromL ? 1 : -1,
          size: 8 + Math.random() * 16,
          color: FISH[Math.floor(Math.random() * FISH.length)].color,
          alpha: 0.12 + Math.random() * 0.18,
          phase: 0, lingerTime: 0, wobble: Math.random() * 6.28, drawY: sy
        });
      }
    }
    this.shadowFish = this.shadowFish.filter(f => {
      f.wobble += 0.04; f.drawY = f.y + Math.sin(f.wobble) * 6;
      if (f.phase === 0) {
        f.x += f.speed * f.dir;
        if (Math.abs(f.x - f.targetX) < 10) { f.phase = 1; f.lingerTime = 1 + Math.random() * 2; }
      } else if (f.phase === 1) {
        f.x += Math.sin(f.wobble * 2) * 0.6; f.y += Math.cos(f.wobble * 2) * 0.4;
        f.lingerTime -= dt;
        if (f.lingerTime <= 0) { f.phase = 2; f.dir = Math.random() > 0.5 ? 1 : -1; f.speed = 1.5 + Math.random(); }
      } else {
        f.x += f.speed * f.dir * 1.8; f.alpha -= 0.004;
      }
      return f.alpha > 0 && f.x > -60 && f.x < W + 60;
    });

    // Line tugs
    if (Math.random() < 0.015) { this.lineTug = 5 + Math.random() * 10; audio.tug(); }
    if (this.lineTug > 0.1) this.lineTug *= 0.88; else this.lineTug = 0;

    // Cycle status
    this.wStatusT += dt;
    if (this.wStatusT > 2.2) {
      this.wStatusT = 0; this.wStatusIdx++;
      this.showStatus(WAIT_MSGS[this.wStatusIdx % WAIT_MSGS.length]);
    }
  }
};

// ─── INPUT ───
document.addEventListener('keydown', e => {
  if (e.code === 'Space' || e.code === 'Enter') {
    e.preventDefault();
    if (game.state === 'INSTRUCTIONS') game.dismissInstructions();
    else if (game.state === 'TITLE') game.cast();
    else if (game.state === 'BITE') game.hookIt();
    else if (game.state === 'REELING') game.lockMeter();
  }
});

// Robust touch/click handling for overlays
function addTap(id, fn) {
  const el = $(id);
  el.addEventListener('click', e => { e.preventDefault(); fn(); });
  el.addEventListener('touchend', e => { e.preventDefault(); fn(); });
}
addTap('bite-alert', () => game.hookIt());
addTap('reel-screen', () => game.lockMeter());

/* ═══════════════════════════════════════════════════
   CANVAS RENDERER
   ═══════════════════════════════════════════════════ */
const canvas = $('c');
const ctx = canvas.getContext('2d');
let W, H, t = 0, lastTime = 0;
let particles = [], buildings = [], bgFish = [];

function initParticles() {
  particles = [];
  for (let i = 0; i < 60; i++) {
    particles.push({
      x: Math.random() * W, y: H * 0.45 + Math.random() * H * 0.55,
      vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.1,
      r: 1 + Math.random() * 2, alpha: 0.1 + Math.random() * 0.3,
      color: ['#00f0ff', '#ff2a6d', '#b026ff', '#05ffa1'][Math.floor(Math.random() * 4)]
    });
  }
}

function initBuildings() {
  buildings = []; const wy = H * 0.45;
  [[.05,.32,.04],[.1,.28,.035],[.15,.35,.03],[.2,.22,.045],[.27,.3,.035],[.33,.26,.04],
   [.4,.34,.03],[.45,.2,.05],[.52,.31,.035],[.58,.25,.04],[.64,.33,.03],[.7,.24,.045],
   [.77,.3,.035],[.83,.27,.04],[.9,.35,.035],[.95,.29,.03]].forEach(([bx, bh, bw]) => {
    const x = bx * W, w = bw * W, y = wy - H * (0.45 - bh), wins = [];
    for (let ry = y + 4; ry < wy - 4; ry += 6)
      for (let rx = x + 3; rx < x + w - 3; rx += 5)
        if (Math.random() > 0.55) wins.push({ x: rx, y: ry, c: ['rgba(0,240,255,0.15)', 'rgba(255,42,109,0.1)', 'rgba(240,224,48,0.08)'][Math.floor(Math.random() * 3)] });
    buildings.push({ x, y, w, h: wy - y, wins });
  });
}

function initBgFish() {
  bgFish = [];
  for (let i = 0; i < 8; i++) {
    bgFish.push({
      x: Math.random() * W, y: H * 0.5 + Math.random() * H * 0.4,
      speed: 0.3 + Math.random() * 0.6, dir: Math.random() > 0.5 ? 1 : -1,
      size: 4 + Math.random() * 8,
      color: FISH[Math.floor(Math.random() * FISH.length)].color,
      alpha: 0.05 + Math.random() * 0.1, wobble: Math.random() * 6.28
    });
  }
}

function resize() {
  const dpr = window.devicePixelRatio || 1;
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  initParticles(); initBuildings(); initBgFish();
}
window.addEventListener('resize', resize);
resize();

// ── DRAW LOOP ──
function draw(now) {
  const dt = lastTime ? (now - lastTime) / 1000 : 0.016;
  lastTime = now; t += dt;
  ctx.clearRect(0, 0, W, H);
  game.updateWaiting(dt);

  const waterY = H * 0.45;

  // Sky
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#0a0a12'); sky.addColorStop(0.4, '#0d0d1a');
  sky.addColorStop(0.45, '#0a1628'); sky.addColorStop(1, '#060610');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

  // Buildings
  buildings.forEach(b => {
    ctx.fillStyle = 'rgba(15,15,30,0.8)'; ctx.fillRect(b.x, b.y, b.w, b.h);
    b.wins.forEach(w => { ctx.fillStyle = w.c; ctx.fillRect(w.x, w.y, 2, 3); });
  });

  // Water body
  ctx.beginPath(); ctx.moveTo(0, waterY);
  for (let x = 0; x <= W; x += 4) ctx.lineTo(x, waterY + Math.sin(x * 0.008 + t * 1.2) * 3 + Math.sin(x * 0.015 + t * 0.8) * 2);
  ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
  const wg = ctx.createLinearGradient(0, waterY, 0, H);
  wg.addColorStop(0, 'rgba(0,20,40,0.6)'); wg.addColorStop(0.3, 'rgba(5,10,30,0.8)'); wg.addColorStop(1, 'rgba(3,3,10,0.95)');
  ctx.fillStyle = wg; ctx.fill();

  // Water surface glow
  ctx.beginPath(); ctx.moveTo(0, waterY);
  for (let x = 0; x <= W; x += 4) ctx.lineTo(x, waterY + Math.sin(x * 0.008 + t * 1.2) * 3 + Math.sin(x * 0.015 + t * 0.8) * 2);
  ctx.strokeStyle = 'rgba(0,240,255,0.15)'; ctx.lineWidth = 2; ctx.stroke();

  // Neon reflections
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.ellipse(W * (0.1 + i * 0.2) + Math.sin(t * 0.5 + i) * 20, waterY + 10 + i * 8, 30 + Math.sin(t + i * 2) * 15, 1.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0,240,255,${0.04 + Math.sin(t + i) * 0.02})`; ctx.fill();
  }

  // Underwater particles
  particles.forEach(p => {
    p.x += p.vx + Math.sin(t * 0.5 + p.y * 0.01) * 0.2; p.y += p.vy;
    if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
    if (p.y < waterY + 10) p.y = H - 10; if (p.y > H) p.y = waterY + 10;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = p.color; ctx.globalAlpha = p.alpha * (0.5 + Math.sin(t * 2 + p.x) * 0.5);
    ctx.fill(); ctx.globalAlpha = 1;
  });

  // Background ambient fish
  bgFish.forEach(f => {
    f.x += f.speed * f.dir; f.wobble += 0.03;
    const fy = f.y + Math.sin(f.wobble) * 8;
    if (f.dir > 0 && f.x > W + 20) f.x = -20;
    if (f.dir < 0 && f.x < -20) f.x = W + 20;
    ctx.save(); ctx.translate(f.x, fy); ctx.scale(f.dir, 1);
    ctx.globalAlpha = f.alpha; ctx.fillStyle = f.color;
    ctx.beginPath(); ctx.moveTo(f.size, 0);
    ctx.lineTo(-f.size, -f.size * 0.5); ctx.lineTo(-f.size * 0.4, 0); ctx.lineTo(-f.size, f.size * 0.5);
    ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1; ctx.restore();
  });

  // ── FISHING LINE + WAITING VISUALS ──
  if (game.state === 'CASTING' || game.state === 'WAITING' || game.state === 'BITE') {
    game.lineY += (game.targetLineY - game.lineY) * 0.06;
    const rodX = W * 0.5, rodY = H * 0.12, hx = game.hookX;
    const tugX = game.lineTug * Math.sin(t * 25);
    const tugY = game.lineTug * Math.cos(t * 30) * 0.5;
    const hy = game.lineY + tugY;

    // Line
    ctx.beginPath(); ctx.moveTo(rodX, rodY);
    ctx.bezierCurveTo(
      rodX + (hx - rodX) * 0.3 + tugX * 0.3, rodY + (hy - rodY) * 0.2,
      hx - (hx - rodX) * 0.1 + tugX * 0.6, hy - 30 + tugY,
      hx + tugX, hy);
    ctx.strokeStyle = game.state === 'BITE' ? 'rgba(255,42,109,0.6)' : game.lineTug > 1 ? 'rgba(240,224,48,0.5)' : 'rgba(0,240,255,0.3)';
    ctx.lineWidth = game.lineTug > 1 ? 2 : 1.5; ctx.stroke();

    // Hook
    ctx.beginPath(); ctx.arc(hx + tugX, hy, game.state === 'BITE' ? 6 + Math.sin(t * 10) * 3 : 3, 0, Math.PI * 2);
    ctx.fillStyle = game.state === 'BITE' ? 'rgba(255,42,109,0.8)' : 'rgba(0,240,255,0.5)'; ctx.fill();

    // Bobber
    if (hy > waterY) {
      const by = waterY + Math.sin(t * 2) * 2 + (game.lineTug > 1 ? -game.lineTug * 0.8 : 0);
      ctx.beginPath(); ctx.arc(hx, by, 4 + (game.lineTug > 1 ? 1 : 0), 0, Math.PI * 2);
      ctx.fillStyle = '#ff2a6d'; ctx.fill();
      ctx.beginPath(); ctx.arc(hx, by, 7, 0, Math.PI * 2);
      ctx.strokeStyle = game.lineTug > 1 ? 'rgba(240,224,48,0.4)' : 'rgba(255,42,109,0.3)';
      ctx.lineWidth = 1; ctx.stroke();
      if (game.lineTug > 2) {
        ctx.beginPath(); ctx.arc(hx, by, 10 + game.lineTug, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0,240,255,${game.lineTug * 0.03})`; ctx.stroke();
      }
    }

    // Waiting-state FX
    if (game.state === 'WAITING') {
      // Sonar
      game.sonarRings.forEach(s => {
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0,240,255,${s.alpha})`; ctx.lineWidth = 1;
        ctx.setLineDash([3, 4]); ctx.stroke(); ctx.setLineDash([]);
      });
      // Bubbles
      game.bubbles.forEach(b => {
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0,240,255,${b.alpha * 0.6})`; ctx.lineWidth = 0.8; ctx.stroke();
        ctx.fillStyle = `rgba(0,240,255,${b.alpha * 0.15})`; ctx.fill();
        ctx.beginPath(); ctx.arc(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${b.alpha * 0.4})`; ctx.fill();
      });
      // Shadow fish
      game.shadowFish.forEach(f => {
        ctx.save(); ctx.translate(f.x, f.drawY); ctx.scale(f.dir, 1);
        ctx.globalAlpha = f.alpha; ctx.shadowColor = f.color; ctx.shadowBlur = 12;
        ctx.fillStyle = f.color;
        ctx.beginPath(); ctx.ellipse(0, 0, f.size, f.size * 0.35, 0, 0, Math.PI * 2); ctx.fill();
        const tf = Math.sin(t * 6 + f.wobble) * f.size * 0.25;
        ctx.beginPath(); ctx.moveTo(-f.size, 0);
        ctx.lineTo(-f.size * 1.5, -f.size * 0.35 + tf); ctx.lineTo(-f.size * 1.5, f.size * 0.35 + tf);
        ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.arc(f.size * 0.55, -f.size * 0.05, f.size * 0.08, 0, Math.PI * 2);
        ctx.fillStyle = '#fff'; ctx.globalAlpha = f.alpha * 1.5; ctx.fill();
        ctx.shadowBlur = 0; ctx.globalAlpha = 1; ctx.restore();
      });
    }
  }

  // Ripples
  game.ripples = game.ripples.filter(r => {
    r.r += 1.5; r.alpha *= 0.96;
    ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(0,240,255,${r.alpha})`; ctx.lineWidth = 1; ctx.stroke();
    return r.alpha > 0.01;
  });

  requestAnimationFrame(draw);
}
requestAnimationFrame(draw);
