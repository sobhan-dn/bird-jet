const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d", { alpha: false });
canvas.tabIndex = 0;
const menu = document.querySelector("#menu");
const scoreEl = document.querySelector("#score");
const comboEl = document.querySelector("#combo");
const modeEl = document.querySelector("#mode");

const buttons = {
  start: document.querySelector("#start"),
  generate: document.querySelector("#generate"),
  flap: document.querySelector("#flap"),
  shift: document.querySelector("#shift"),
  blast: document.querySelector("#blast"),
};

const TAU = Math.PI * 2;
const DPR_CAP = 1;
let dpr = 1;
let w = 390;
let h = 844;
let last = performance.now();
let raf = 0;

const state = {
  phase: "menu",
  time: 0,
  seed: Math.floor(Math.random() * 999999),
  score: 0,
  shake: 0,
  flash: 0,
  world: null,
  keys: new Set(),
  shots: [],
  sparks: [],
  enemies: [],
  pointer: { active: false, x: 0, y: 0 },
  player: {
    x: 96,
    y: 360,
    vx: 0,
    vy: 0,
    pull: 0,
    r: 22,
    mode: "bird",
    combo: 1,
    flapWindow: 0,
    heat: 0,
    hp: 5,
    shotCd: 0,
    invuln: 0,
  },
};

function mulberry32(seed) {
  return function random() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeWorld() {
  const rnd = mulberry32(state.seed);
  const palettes = [
    { sky1: "#86e6f0", sky2: "#2f8ebd", sun: "#ffe27a", land: "#2e806b", leaf: "#72d38e", accent: "#ef6f6c" },
    { sky1: "#f8b46a", sky2: "#5576c5", sun: "#fff0a2", land: "#375f7a", leaf: "#86d6c8", accent: "#f05d7b" },
    { sky1: "#afe2ff", sky2: "#2e9a8f", sun: "#ffd05f", land: "#48734c", leaf: "#a6dc65", accent: "#e86d41" },
    { sky1: "#b9f2d0", sky2: "#556bc2", sun: "#f7e06e", land: "#236f73", leaf: "#56c6a4", accent: "#ff8a5b" },
  ];
  const palette = palettes[Math.floor(rnd() * palettes.length)];
  const clouds = Array.from({ length: 15 }, (_, i) => ({
    x: rnd() * 900 + i * 70,
    y: 70 + rnd() * 280,
    s: 0.55 + rnd() * 1.2,
    a: 0.16 + rnd() * 0.24,
  }));
  const islands = Array.from({ length: 10 }, (_, i) => ({
    x: i * 210 + rnd() * 130,
    y: h * (0.68 + rnd() * 0.18),
    s: 0.75 + rnd() * 1.25,
  }));
  state.world = { palette, clouds, islands, stars: Array.from({ length: 70 }, () => [rnd() * 1200, rnd() * 460, rnd()]) };
}

function resetGame() {
  state.phase = "playing";
  state.time = 0;
  state.score = 0;
  state.shake = 0;
  state.flash = 0;
  state.shots = [];
  state.sparks = [];
  state.enemies = [];
  Object.assign(state.player, {
    x: Math.max(82, w * 0.24),
    y: h * 0.48,
    vx: 0,
    vy: 0,
    pull: 0,
    mode: "bird",
    combo: 1,
    flapWindow: 0.2,
    heat: 0,
    hp: 5,
    shotCd: 0,
    invuln: 0,
  });
  for (let i = 0; i < 5; i += 1) spawnEnemy(w + 170 + i * 165);
  menu.classList.add("hidden");
  canvas.focus({ preventScroll: true });
}

function spawnEnemy(x = w + 160) {
  const rnd = mulberry32(state.seed + Math.floor(state.time * 1000) + state.enemies.length * 97);
  state.enemies.push({
    x,
    y: 130 + rnd() * Math.max(280, h - 300),
    vx: -88 - rnd() * 64,
    vy: 0,
    r: 21,
    mode: rnd() > 0.52 ? "bird" : "jet",
    hp: 2,
    flapClock: rnd() * 0.55,
    swapClock: 0.7 + rnd() * 1.2,
    shotCd: 0.5 + rnd() * 1.6,
  });
}

function resize() {
  dpr = Math.min(DPR_CAP, window.devicePixelRatio || 1);
  w = Math.max(320, window.innerWidth);
  h = Math.max(560, window.innerHeight);
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (!state.world) makeWorld();
}

function flap() {
  if (state.phase !== "playing") resetGame();
  const p = state.player;
  if (p.mode === "jet") {
    const dx = state.pointer.active ? state.pointer.x - p.x : 1;
    const dy = state.pointer.active ? state.pointer.y - p.y : -0.08;
    const len = Math.max(1, Math.hypot(dx, dy));
    p.vx += (dx / len) * 120;
    p.vy += (dy / len) * 120;
    p.heat = Math.min(1, p.heat + 0.15);
    addSparks(p.x - 24, p.y + 8, 4, "#ffcf61");
    return;
  }
  p.combo = p.flapWindow > 0 ? Math.min(8.5, p.combo + 0.72) : 1;
  p.flapWindow = 0.54;
  p.vy = -285 - p.combo * 45;
  p.vx = 42 + p.combo * 8;
  addSparks(p.x - 16, p.y + 12, 5, "#ffffff");
}

function toggleMode() {
  if (state.phase !== "playing") resetGame();
  const p = state.player;
  p.mode = p.mode === "bird" ? "jet" : "bird";
  p.vx += p.mode === "jet" ? 70 : -35;
  p.heat = p.mode === "jet" ? Math.min(0.65, p.heat + 0.25) : Math.max(0, p.heat - 0.25);
  state.flash = 0.16;
  addSparks(p.x, p.y, 14, p.mode === "jet" ? "#46d9ff" : "#f6d860");
}

function shoot() {
  if (state.phase !== "playing") resetGame();
  const p = state.player;
  if (p.shotCd > 0) return;
  p.shotCd = p.mode === "jet" ? 0.48 : 0.14;
  const speed = p.mode === "jet" ? 620 : 430;
  if (p.mode === "bird") {
    state.shots.push({ owner: "player", x: p.x + 28, y: p.y - 9, vx: speed, vy: -42, r: 5.5, life: 1.05, kind: p.mode });
    state.shots.push({ owner: "player", x: p.x + 28, y: p.y + 7, vx: speed, vy: 22, r: 5.5, life: 1.05, kind: p.mode });
  } else {
    state.shots.push({ owner: "player", x: p.x + 30, y: p.y - 2, vx: speed, vy: 0, r: 7, life: 1.05, kind: p.mode });
  }
  addSparks(p.x + 26, p.y, 4, p.mode === "jet" ? "#62e5ff" : "#f6d860");
}

function enemyShoot(e) {
  state.shots.push({ owner: "enemy", x: e.x - 25, y: e.y, vx: e.mode === "jet" ? -410 : -285, vy: e.mode === "bird" ? 35 : 0, r: e.mode === "jet" ? 5 : 7, life: 1.4, kind: e.mode });
}

function addSparks(x, y, count, color) {
  for (let i = 0; i < count; i += 1) {
    const a = Math.random() * TAU;
    const sp = 40 + Math.random() * 150;
    state.sparks.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.25 + Math.random() * 0.28, color });
  }
}

function update(dt) {
  if (state.phase !== "playing") {
    state.time += dt;
    return;
  }
  state.time += dt;
  state.shake = Math.max(0, state.shake - dt * 5);
  state.flash = Math.max(0, state.flash - dt);
  const p = state.player;
  p.flapWindow -= dt;
  p.shotCd = Math.max(0, p.shotCd - dt);
  p.invuln = Math.max(0, p.invuln - dt);
  p.heat = Math.max(0, p.heat - dt * (p.mode === "jet" ? 0.08 : 0.32));

  if (state.keys.has("KeyR") || state.keys.has("KeyJ") || state.keys.has("Enter")) shoot();

  if (p.mode === "bird") {
    p.pull = 0;
    const missed = p.flapWindow <= 0 ? 1 : 0;
    p.vy += (missed ? 710 : 540) * dt;
    p.vx += (14 - p.vx) * dt * 1.6;
    p.combo = p.flapWindow > 0 ? p.combo : Math.max(1, p.combo - dt * 3.2);
  } else {
    const left = state.keys.has("ArrowLeft") || state.keys.has("KeyA");
    const right = state.keys.has("ArrowRight") || state.keys.has("KeyD");
    const up = state.keys.has("ArrowUp") || state.keys.has("KeyW");
    const down = state.keys.has("ArrowDown") || state.keys.has("KeyS");
    let targetVx = 170;
    let targetVy = 0;
    if (state.pointer.active) {
      const dx = state.pointer.x - p.x;
      const dy = state.pointer.y - p.y;
      const len = Math.max(1, Math.hypot(dx, dy));
      const speed = Math.min(270, len * 3.1);
      p.pull = Math.min(1, len / Math.min(w, h) * 2.2);
      targetVx = (dx / len) * speed + 80;
      targetVy = (dy / len) * speed;
    } else {
      p.pull = left || right || up || down ? 0.72 : 0.18;
      targetVx = left || right ? (right ? 270 : 0) - (left ? 230 : 0) : 150;
      targetVy += (down ? 210 : 0) - (up ? 210 : 0);
    }
    p.vx += (targetVx - p.vx) * dt * 5.2;
    p.vy += (targetVy - p.vy) * dt * 5.2;
    p.heat = Math.min(1, p.heat + dt * 0.17);
  }

  p.y += p.vy * dt;
  p.x += p.vx * dt;
  if (p.mode === "jet") {
    const minX = 44;
    const maxX = w - 44;
    if (p.x < minX) {
      p.x = minX;
      p.vx = Math.max(0, p.vx);
    }
    if (p.x > maxX) {
      p.x = maxX;
      p.vx = Math.min(0, p.vx);
    }
  } else {
    p.x += (Math.max(72, Math.min(w * 0.42, p.x)) - p.x) * dt * 2.5;
  }
  if (p.y < 72) {
    p.y = 72;
    p.vy *= -0.2;
  }
  if (p.y > h - 112) {
    if (p.mode === "jet") {
      p.y = h - 112;
      p.vy = Math.min(0, p.vy);
    } else {
      damagePlayer(1, true);
    }
  }

  for (const e of state.enemies) {
    e.swapClock -= dt;
    e.flapClock -= dt;
    e.shotCd -= dt;
    if (e.swapClock <= 0) {
      e.mode = e.mode === "bird" ? "jet" : "bird";
      e.swapClock = 0.85 + Math.random() * 1.35;
      addSparks(e.x, e.y, 7, e.mode === "jet" ? "#46d9ff" : "#f6d860");
    }
    if (e.mode === "bird") {
      e.vy += 520 * dt;
      if (e.flapClock <= 0) {
        e.vy = -210 - Math.random() * 90;
        e.flapClock = 0.35 + Math.random() * 0.28;
      }
      e.vx += (-112 - e.vx) * dt * 2;
    } else {
      e.vx += (-195 - e.vx) * dt * 2.4;
      e.vy += ((p.y - e.y) * 0.9 - e.vy) * dt * 1.8;
    }
    if (e.shotCd <= 0 && e.x > p.x + 70 && e.x < w + 80) {
      enemyShoot(e);
      e.shotCd = e.mode === "jet" ? 0.85 : 1.25;
    }
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    e.y = Math.max(74, Math.min(h - 136, e.y));
  }

  for (const s of state.shots) {
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.life -= dt;
  }
  state.shots = state.shots.filter((s) => s.life > 0 && s.x > -80 && s.x < w + 120);

  for (const s of state.shots) {
    if (s.owner === "player") {
      for (const e of state.enemies) {
        if (dist(s, e) < s.r + e.r) {
          s.life = 0;
          e.hp -= s.kind === "jet" ? 2 : 1;
          addSparks(e.x, e.y, 12, s.kind === "jet" ? "#62e5ff" : "#f6d860");
          if (e.hp <= 0) {
            state.score += e.mode === "jet" ? 150 : 100;
            state.shake = 0.18;
            e.dead = true;
            addSparks(e.x, e.y, 26, "#ffffff");
          }
        }
      }
    } else if (dist(s, p) < s.r + p.r * 0.82) {
      s.life = 0;
      damagePlayer(1, false, 35);
    }
  }

  for (const e of state.enemies) {
    if (!e.dead && dist(e, p) < e.r + p.r * 0.82) {
      e.dead = true;
      damagePlayer(1, false, 25);
      addSparks(e.x, e.y, 20, "#ffffff");
    }
  }

  state.enemies = state.enemies.filter((e) => !e.dead && e.x > -90);
  while (state.enemies.length < 5) spawnEnemy(w + 150 + Math.random() * 180);

  for (const sp of state.sparks) {
    sp.x += sp.vx * dt;
    sp.y += sp.vy * dt;
    sp.vy += 180 * dt;
    sp.life -= dt;
  }
  state.sparks = state.sparks.filter((sp) => sp.life > 0);

  const travel = Math.min(1.6, Math.hypot(p.vx, p.vy) / 260);
  const jetPullBonus = p.mode === "jet" ? p.pull * 18 + travel * 9 : 0;
  state.score += dt * (p.mode === "jet" ? 8 + jetPullBonus : 6);
  scoreEl.textContent = Math.floor(state.score).toString();
  comboEl.textContent = `x${p.combo.toFixed(1)}`;
  modeEl.textContent = p.mode === "jet" ? "جت" : "پرنده";
}

function damagePlayer(amount, fell, scorePenalty = 0) {
  const p = state.player;
  if (p.invuln > 0 && !fell) return;
  p.hp -= amount;
  if (scorePenalty > 0) state.score = Math.max(0, state.score - scorePenalty);
  p.invuln = 0.85;
  state.shake = 0.25;
  p.y = Math.min(p.y, h - 180);
  p.vy = -230;
  addSparks(p.x, p.y, 22, fell ? "#ff7f5b" : "#e8555b");
  if (p.hp <= 0) {
    state.phase = "menu";
    menu.classList.remove("hidden");
    menu.querySelector("p").textContent = `امتیاز ${Math.floor(state.score)}. دوباره شروع کن و بین بال زدن و جت شدن دقیق‌تر سوییچ کن.`;
  }
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function drawBackground() {
  const p = state.world.palette;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, p.sky1);
  g.addColorStop(0.56, p.sky2);
  g.addColorStop(1, "#102737");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  const sunX = w * 0.76;
  const sunY = h * 0.18;
  const sg = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, Math.min(w, h) * 0.34);
  sg.addColorStop(0, p.sun);
  sg.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.arc(sunX, sunY, Math.min(w, h) * 0.34, 0, TAU);
  ctx.fill();

  for (const star of state.world.stars) {
    const x = (star[0] - state.time * 18) % (w + 80);
    ctx.globalAlpha = 0.16 + star[2] * 0.22;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect((x + w) % (w + 80), star[1], 1.4, 1.4);
  }
  ctx.globalAlpha = 1;

  for (const c of state.world.clouds) {
    const x = ((c.x - state.time * 28 * c.s) % (w + 220)) - 110;
    drawCloud(x, c.y, c.s, c.a);
  }

  for (const island of state.world.islands) {
    const x = ((island.x - state.time * 70) % (w + 300)) - 150;
    drawIsland(x, island.y, island.s);
  }
}

function drawCloud(x, y, s, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.ellipse(x, y, 46 * s, 15 * s, 0, 0, TAU);
  ctx.ellipse(x + 28 * s, y - 6 * s, 28 * s, 18 * s, 0, 0, TAU);
  ctx.ellipse(x - 28 * s, y - 5 * s, 26 * s, 17 * s, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawIsland(x, y, s) {
  const p = state.world.palette;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.beginPath();
  ctx.ellipse(0, 18, 78, 20, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = p.land;
  ctx.beginPath();
  ctx.moveTo(-82, 0);
  ctx.quadraticCurveTo(-28, -36, 68, -16);
  ctx.quadraticCurveTo(52, 16, -12, 28);
  ctx.quadraticCurveTo(-60, 20, -82, 0);
  ctx.fill();
  ctx.fillStyle = p.leaf;
  for (let i = -2; i <= 2; i += 1) {
    ctx.beginPath();
    ctx.ellipse(i * 22, -18 - Math.abs(i) * 5, 22, 9, -0.4 + i * 0.16, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function render() {
  ctx.save();
  const shakeX = state.shake ? (Math.random() - 0.5) * state.shake * 14 : 0;
  const shakeY = state.shake ? (Math.random() - 0.5) * state.shake * 14 : 0;
  ctx.translate(shakeX, shakeY);
  drawBackground();
  drawGate();
  for (const s of state.shots) drawShot(s);
  for (const e of state.enemies) drawVehicle(e, true);
  drawVehicle(state.player, false);
  for (const sp of state.sparks) {
    ctx.globalAlpha = Math.max(0, sp.life * 3);
    ctx.fillStyle = sp.color;
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, 2.2, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (state.flash > 0) {
    ctx.globalAlpha = state.flash * 1.8;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawGate() {
  const x = ((state.time * -130) % 260) + w - 90;
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath();
    ctx.ellipse(x + i * 260, h * 0.48, 44, h * 0.36, 0, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
}

function drawShot(s) {
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.fillStyle = s.owner === "player" ? (s.kind === "jet" ? "#62e5ff" : "#f6d860") : "#e8555b";
  ctx.shadowColor = ctx.fillStyle;
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.ellipse(0, 0, s.r * 1.8, s.r, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawVehicle(v, enemy) {
  ctx.save();
  ctx.translate(v.x, v.y);
  const dir = enemy ? -1 : 1;
  ctx.scale(dir, 1);
  if (v.invuln > 0 && Math.floor(state.time * 18) % 2 === 0) ctx.globalAlpha = 0.45;
  if (v.mode === "jet") drawJet(v, enemy);
  else drawBird(v, enemy);
  ctx.restore();
}

function drawBird(v, enemy) {
  const wing = Math.sin(state.time * 18 + v.x * 0.03) * 0.9;
  const body = enemy ? "#e8555b" : "#f6d860";
  const trim = enemy ? "#642337" : "#1f6f7a";
  ctx.fillStyle = "rgba(0,0,0,0.20)";
  ctx.beginPath();
  ctx.ellipse(-2, 24, 24, 6, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 0, 27, 18, -0.08, 0, TAU);
  ctx.fill();
  ctx.fillStyle = trim;
  ctx.beginPath();
  ctx.moveTo(-8, 2);
  ctx.quadraticCurveTo(-40, -34 * wing, -17, 14);
  ctx.quadraticCurveTo(-3, 11, -8, 2);
  ctx.fill();
  ctx.fillStyle = "#fff7d7";
  ctx.beginPath();
  ctx.moveTo(23, -3);
  ctx.lineTo(39, 2);
  ctx.lineTo(23, 8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#07131b";
  ctx.beginPath();
  ctx.arc(13, -7, 3, 0, TAU);
  ctx.fill();
}

function drawJet(v, enemy) {
  const body = enemy ? "#d84d68" : "#45d3ee";
  const trim = enemy ? "#ffd166" : "#f8fbff";
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(-4, 24, 31, 6, 0, 0, TAU);
  ctx.fill();
  const flame = 14 + Math.sin(state.time * 34) * 6;
  ctx.fillStyle = "#ffcf61";
  ctx.beginPath();
  ctx.moveTo(-32, -6);
  ctx.lineTo(-32 - flame, 0);
  ctx.lineTo(-32, 7);
  ctx.fill();
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(36, 0);
  ctx.quadraticCurveTo(11, -19, -32, -11);
  ctx.lineTo(-24, 0);
  ctx.lineTo(-32, 12);
  ctx.quadraticCurveTo(12, 18, 36, 0);
  ctx.fill();
  ctx.fillStyle = trim;
  ctx.beginPath();
  ctx.moveTo(-6, -5);
  ctx.lineTo(-24, -28);
  ctx.lineTo(10, -9);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-3, 7);
  ctx.lineTo(-22, 27);
  ctx.lineTo(12, 9);
  ctx.fill();
  ctx.fillStyle = "rgba(7,19,27,0.6)";
  ctx.beginPath();
  ctx.ellipse(14, -3, 9, 5, -0.2, 0, TAU);
  ctx.fill();
}

function loop(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  update(dt);
  render();
  raf = requestAnimationFrame(loop);
}

function bindPress(el, down, up = () => {}) {
  el.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    down();
  });
  el.addEventListener("pointerup", (event) => {
    event.preventDefault();
    up();
  });
}

function setPointer(event, active) {
  const rect = canvas.getBoundingClientRect();
  state.pointer.active = active;
  state.pointer.x = event.clientX - rect.left;
  state.pointer.y = event.clientY - rect.top;
}

buttons.start.addEventListener("click", resetGame);
buttons.generate.addEventListener("click", () => {
  state.seed = Math.floor(Math.random() * 999999);
  makeWorld();
  state.flash = 0.22;
});
bindPress(buttons.flap, flap);
bindPress(buttons.shift, toggleMode);
bindPress(buttons.blast, shoot);

canvas.addEventListener("pointerdown", (event) => {
  if (event.target !== canvas) return;
  if (state.phase !== "playing") resetGame();
  setPointer(event, true);
});
canvas.addEventListener("pointermove", (event) => {
  if (state.pointer.active) setPointer(event, true);
});
canvas.addEventListener("pointerup", (event) => setPointer(event, false));
canvas.addEventListener("pointercancel", (event) => setPointer(event, false));

function onKeyDown(event) {
  if (event.repeat) return;
  if (event.code === "KeyF") {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  }
  if (event.code === "Space" || event.code === "ArrowUp") flap();
  if (event.code === "KeyE") toggleMode();
  if (event.code === "KeyR" || event.code === "Enter" || event.code === "KeyJ") shoot();
  state.keys.add(event.code);
}

document.addEventListener("keydown", onKeyDown);
document.addEventListener("keyup", (event) => state.keys.delete(event.code));
window.addEventListener("resize", resize);

window.render_game_to_text = () =>
  JSON.stringify({
    note: "Coordinate origin is top-left; x grows right, y grows downward.",
    phase: state.phase,
    score: Math.floor(state.score),
    player: {
      x: Math.round(state.player.x),
      y: Math.round(state.player.y),
      vy: Math.round(state.player.vy),
      mode: state.player.mode,
      combo: Number(state.player.combo.toFixed(1)),
      pull: Number(state.player.pull.toFixed(2)),
      hp: state.player.hp,
      heat: Number(state.player.heat.toFixed(2)),
    },
    enemies: state.enemies.slice(0, 5).map((e) => ({ x: Math.round(e.x), y: Math.round(e.y), mode: e.mode, hp: e.hp })),
    shots: state.shots.slice(0, 8).map((s) => ({ owner: s.owner, x: Math.round(s.x), y: Math.round(s.y), kind: s.kind })),
  });

window.advanceTime = (ms) => {
  const steps = Math.max(1, Math.round(ms / (1000 / 60)));
  for (let i = 0; i < steps; i += 1) update(1 / 60);
  render();
};

resize();
makeWorld();
render();
cancelAnimationFrame(raf);
raf = requestAnimationFrame(loop);
