// ── boot.js — ORION entry screen ──
// The background here is the same terrain/radar/blip/jet system used across
// his standby, brb, intermission and ending overlays — kept as-is rather
// than reinvented, so the entry point reads as the same asset family.

(function () {
  const canvas = document.getElementById('bgcanvas');
  const ctx = canvas.getContext('2d');
  let W, H, CX, CY;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    CX = W / 2; CY = H / 2 + 30;
    buildTerrain();
    buildBlips();
  }

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // ---------- topo contour terrain ----------
  let terrain = [];
  function buildTerrain() {
    const rng = mulberry32(11);
    terrain = Array.from({ length: 5 }, (_, i) => ({
      cx: rng() * W, cy: rng() * H,
      baseR: 40 + rng() * 30, rings: 4 + Math.floor(rng() * 3),
      seed: 11 + i * 13, gap: 18 + rng() * 6
    }));
  }
  function contourCluster(cx, cy, baseR, rings, seed, gap, alpha) {
    const rng = mulberry32(seed);
    for (let ring = 0; ring < rings; ring++) {
      const r = baseR + ring * gap;
      const jitter = Array.from({ length: 26 }, () => (rng() - 0.5) * 12);
      ctx.beginPath();
      for (let i = 0; i <= 26; i++) {
        const a = (i / 26) * Math.PI * 2;
        const rr = r + jitter[i % jitter.length];
        const x = cx + Math.cos(a) * rr;
        const y = cy + Math.sin(a) * rr * 0.84;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = `rgba(125,255,171,${alpha - ring * (alpha * 0.85 / rings)})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  function drawTerrain() {
    terrain.forEach(p => contourCluster(p.cx, p.cy, p.baseR, p.rings, p.seed, p.gap, 0.13));
  }

  // ---------- radar sweep ----------
  const sweepR = () => Math.max(W, H) * 0.45;
  function drawRadarRing() {
    const r = sweepR();
    ctx.beginPath(); ctx.arc(CX, CY, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(125,255,171,0.10)'; ctx.lineWidth = 1; ctx.stroke();
    [0.33, 0.66].forEach(f => {
      ctx.beginPath(); ctx.arc(CX, CY, r * f, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(125,255,171,0.06)'; ctx.stroke();
    });
  }
  function drawSweep(t) {
    const r = sweepR();
    const angle = (t * 0.012) % (Math.PI * 2);
    let fillStyle = 'rgba(125,255,171,0.07)';
    if (ctx.createConicGradient) {
      const grad = ctx.createConicGradient(angle, CX, CY);
      grad.addColorStop(0, 'rgba(125,255,171,0.20)');
      grad.addColorStop(0.12, 'rgba(125,255,171,0.0)');
      grad.addColorStop(1, 'rgba(125,255,171,0.0)');
      fillStyle = grad;
    }
    ctx.beginPath(); ctx.moveTo(CX, CY);
    ctx.arc(CX, CY, r, angle, angle + 0.55); ctx.closePath();
    ctx.fillStyle = fillStyle; ctx.fill();
  }

  // ---------- unit blips ----------
  let blips = [];
  function buildBlips() {
    const rng = mulberry32(90);
    blips = Array.from({ length: 7 }, () => ({
      x: rng() * W, y: rng() * H,
      phase: rng() * Math.PI * 2, speed: 0.02 + rng() * 0.02,
      friendly: rng() > 0.35
    }));
  }
  function drawBlips(t) {
    blips.forEach(b => {
      const pulse = 0.5 + Math.sin(t * b.speed + b.phase) * 0.5;
      const col = b.friendly ? '125,255,171' : '255,180,84';
      ctx.beginPath(); ctx.arc(b.x, b.y, 2.2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${col},${0.55 + pulse * 0.35})`; ctx.fill();
      ctx.beginPath(); ctx.arc(b.x, b.y, 9 + pulse * 5, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${col},${0.18 * pulse})`; ctx.lineWidth = 1; ctx.stroke();
    });
  }

  // ---------- loitering jet with contrail ----------
  function drawJetShape(size) {
    ctx.beginPath();
    ctx.moveTo(size * 1.1, 0);
    ctx.lineTo(size * 0.1, size * 0.16);
    ctx.lineTo(-size * 0.35, size * 0.62);
    ctx.lineTo(-size * 0.5, size * 0.62);
    ctx.lineTo(-size * 0.28, size * 0.12);
    ctx.lineTo(-size * 0.95, size * 0.10);
    ctx.lineTo(-size * 0.95, -size * 0.10);
    ctx.lineTo(-size * 0.28, -size * 0.12);
    ctx.lineTo(-size * 0.5, -size * 0.62);
    ctx.lineTo(-size * 0.35, -size * 0.62);
    ctx.lineTo(size * 0.1, -size * 0.16);
    ctx.closePath();
  }
  const jetTrail = [];
  function drawLoiteringJet(t) {
    const angle = t * 0.006;
    const x = CX + Math.cos(angle) * 300;
    const y = CY + Math.sin(angle) * 170;
    const heading = angle + Math.PI / 2;

    jetTrail.push({ x, y });
    if (jetTrail.length > 55) jetTrail.shift();
    for (let i = 0; i < jetTrail.length; i++) {
      const p = jetTrail[i];
      const al = (i / jetTrail.length) * 0.14;
      ctx.beginPath(); ctx.arc(p.x, p.y, 1.3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(216,245,223,${al})`; ctx.fill();
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(heading);
    drawJetShape(15);
    ctx.fillStyle = 'rgba(216,245,223,0.85)';
    ctx.shadowColor = 'rgba(125,255,171,0.6)';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.restore();
  }

  // ---------- occasional broadcast glitch ----------
  let glitchUntil = 0;
  function scheduleGlitch() { setTimeout(() => { glitchUntil = performance.now() + 180; scheduleGlitch(); }, 15000 + Math.random() * 22000); }
  scheduleGlitch();
  function drawGlitch() {
    if (performance.now() > glitchUntil) return;
    ctx.save(); ctx.globalAlpha = 0.05; ctx.fillStyle = '#7dffab';
    for (let i = 0; i < 10; i++) ctx.fillRect(0, Math.random() * H, W, 2 + Math.random() * 3);
    ctx.restore();
  }
  window.__triggerGlitch = () => { glitchUntil = performance.now() + 220; };

  let t = 0;
  function animate() {
    t++;
    ctx.clearRect(0, 0, W, H);
    drawTerrain();
    drawRadarRing();
    drawSweep(t);
    drawBlips(t);
    drawLoiteringJet(t);
    drawGlitch();
    requestAnimationFrame(animate);
  }

  window.addEventListener('resize', resize);
  resize();
  animate();

  // ---------- live HUD readouts ----------
  const startTime = performance.now();
  const pad = n => n.toString().padStart(2, '0');
  setInterval(() => {
    const elapsed = Math.floor((performance.now() - startTime) / 1000);
    const hh = Math.floor(elapsed / 3600), mm = Math.floor((elapsed % 3600) / 60), ss = elapsed % 60;
    const el = document.getElementById('clockReadout');
    if (el) el.textContent = `T+${pad(hh)}:${pad(mm)}:${pad(ss)}`;
  }, 1000);

  function refreshSignal() {
    const total = 5, active = 3 + Math.floor(Math.random() * 3 > 2 ? 1 : 0) + 2;
    const el = document.getElementById('sigBars');
    if (el) el.textContent = '▮'.repeat(Math.min(active, total)) + '▯'.repeat(Math.max(total - active, 0));
  }
  refreshSignal(); setInterval(refreshSignal, 2600);
})();

// ── CLICK TO ENTER — grant clearance, cut to black, hand off to main.html ──
(function () {
  const opline = document.getElementById('opline');
  const title = document.getElementById('title');
  const subline = document.getElementById('subline');
  const entryCue = document.getElementById('entryCue');
  const statusText = document.getElementById('statusText');
  const cutOverlay = document.getElementById('cutOverlay');
  const DEST = 'main.html';

  let entered = false;

  document.addEventListener('click', () => {
    if (entered) return;
    entered = true;

    if (window.__triggerGlitch) window.__triggerGlitch();

    opline.textContent = 'CLEARANCE GRANTED';
    opline.style.color = 'var(--amber)';
    title.textContent = 'ORION';
    subline.innerHTML = 'UPLINK <span class="amber">ESTABLISHED</span>';
    entryCue.style.display = 'none';
    statusText.textContent = 'Deploying';

    setTimeout(() => {
      cutOverlay.classList.add('active');
    }, 550);

    setTimeout(() => {
      window.location.href = DEST;
    }, 1450);
  });
})();