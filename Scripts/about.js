// ── PAGE CHROME — cursor + ambient terrain/radar background ──
// Same self-contained pattern used on schedule.js.
(function () {
  const cursor = document.getElementById('cursor');
  const ring = document.getElementById('cursorRing');
  let mouseX = 0, mouseY = 0, ringX = 0, ringY = 0, ready = false;

  document.addEventListener('mousemove', e => {
    mouseX = e.clientX; mouseY = e.clientY;
    if (!ready) {
      ringX = mouseX; ringY = mouseY; ready = true;
      cursor.style.opacity = '1'; ring.style.opacity = '1';
    }
    cursor.style.left = mouseX + 'px';
    cursor.style.top = mouseY + 'px';
  });
  (function animateRing() {
    ringX += (mouseX - ringX) * 0.14;
    ringY += (mouseY - ringY) * 0.14;
    ring.style.left = ringX + 'px';
    ring.style.top = ringY + 'px';
    requestAnimationFrame(animateRing);
  })();
  document.querySelectorAll('a, button').forEach(el => {
    el.addEventListener('mouseenter', () => {
      ring.style.width = '54px'; ring.style.height = '54px';
      ring.style.borderColor = 'rgba(125,255,171,0.7)';
    });
    el.addEventListener('mouseleave', () => {
      ring.style.width = '34px'; ring.style.height = '34px';
      ring.style.borderColor = 'rgba(125,255,171,0.4)';
    });
  });

  const canvas = document.getElementById('bgcanvas');
  const ctx = canvas.getContext('2d');
  let W, H;

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  let terrain = [];
  function buildTerrain() {
    const rng = mulberry32(53);
    terrain = Array.from({ length: 4 }, (_, i) => ({
      cx: rng() * W, cy: rng() * H,
      baseR: 40 + rng() * 30, rings: 4 + Math.floor(rng() * 3),
      seed: 500 + i * 13, gap: 16 + rng() * 6
    }));
  }
  function contourCluster(cx, cy, baseR, rings, seed, gap) {
    const rng = mulberry32(seed);
    for (let ring = 0; ring < rings; ring++) {
      const r = baseR + ring * gap;
      const jitter = Array.from({ length: 24 }, () => (rng() - 0.5) * 10);
      ctx.beginPath();
      for (let i = 0; i <= 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        const rr = r + jitter[i % jitter.length];
        const x = cx + Math.cos(a) * rr;
        const y = cy + Math.sin(a) * rr * 0.84;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = `rgba(125,255,171,${0.09 - ring * (0.07 / rings)})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  function drawTerrain() { terrain.forEach(p => contourCluster(p.cx, p.cy, p.baseR, p.rings, p.seed, p.gap)); }

  let glitchUntil = 0;
  function scheduleGlitch() { setTimeout(() => { glitchUntil = performance.now() + 150; scheduleGlitch(); }, 18000 + Math.random() * 22000); }
  scheduleGlitch();
  function drawGlitch() {
    if (performance.now() > glitchUntil) return;
    ctx.save(); ctx.globalAlpha = 0.04; ctx.fillStyle = '#7dffab';
    for (let i = 0; i < 7; i++) ctx.fillRect(0, Math.random() * H, W, 2 + Math.random() * 2);
    ctx.restore();
  }

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    buildTerrain();
  }
  window.addEventListener('resize', resize);
  resize();

  function animate() {
    ctx.clearRect(0, 0, W, H);
    drawTerrain();
    drawGlitch();
    requestAnimationFrame(animate);
  }
  animate();
})();

// ── LIVE "LAST ACTIVITY" STAMP ──
(function () {
  const el = document.getElementById('lastActivity');
  if (!el) return;
  const n = new Date();
  el.textContent = n.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
})();

// ── METRIC BARS — fill in once the panel is on screen ──
(function () {
  const bars = document.querySelectorAll('.metric-fill');
  if (!bars.length) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      setTimeout(() => { el.style.width = el.dataset.w + '%'; }, 200);
      io.unobserve(el);
    });
  }, { threshold: 0.3 });
  bars.forEach((b) => io.observe(b));
})();