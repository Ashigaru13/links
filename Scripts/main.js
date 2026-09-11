// ── CUSTOM CURSOR ──
const cursor = document.getElementById('cursor');
const ring   = document.getElementById('cursorRing');
let mouseX = 0, mouseY = 0, ringX = 0, ringY = 0, ready = false;

document.addEventListener('mousemove', e => {
  mouseX = e.clientX; mouseY = e.clientY;
  if (!ready) {
    ringX = mouseX; ringY = mouseY; ready = true;
    cursor.style.opacity = '1'; ring.style.opacity = '1';
  }
  cursor.style.left = mouseX + 'px';
  cursor.style.top  = mouseY + 'px';
});

(function animateRing() {
  ringX += (mouseX - ringX) * 0.14;
  ringY += (mouseY - ringY) * 0.14;
  ring.style.left = ringX + 'px';
  ring.style.top  = ringY + 'px';
  requestAnimationFrame(animateRing);
})();

function bindCursorHover(el) {
  el.addEventListener('mouseenter', () => {
    ring.style.width = '54px'; ring.style.height = '54px';
    ring.style.borderColor = 'rgba(125,255,171,0.7)';
  });
  el.addEventListener('mouseleave', () => {
    ring.style.width = '34px'; ring.style.height = '34px';
    ring.style.borderColor = 'rgba(125,255,171,0.4)';
  });
}

// ── UPTIME CLOCK ──
(function () {
  const startTime = performance.now();
  const pad = n => n.toString().padStart(2, '0');
  const el = document.getElementById('clockReadout');
  if (!el) return;
  setInterval(() => {
    const elapsed = Math.floor((performance.now() - startTime) / 1000);
    const hh = Math.floor(elapsed / 3600), mm = Math.floor((elapsed % 3600) / 60), ss = elapsed % 60;
    el.textContent = `T+${pad(hh)}:${pad(mm)}:${pad(ss)}`;
  }, 1000);
})();

// ── WAYPOINT DATA (each is a link) ──
// Positions are percentages within the map frame, spaced evenly around the patrol loop. [change disabled:true to false to disable a waypoint and remove the disabled arg to enable]
const waypoints = [
  { id: 'twitch', wp: 'WP.01', label: 'Twitch', grid: '47.36N 12.50E', status: 'ON AIR', href: 'https://twitch.tv/orion1367', icon: 'fa-brands fa-twitch', x: 50, y: 14, live: true },
  { id: 'youtube', wp: 'WP.02', label: 'YouTube', grid: '47.41N 12.58E', status: 'NO SIGNAL', href: 'https://www.youtube.com/@orion1367', icon: 'fa-brands fa-youtube', x: 79, y: 27, disabled: true },
  { id: 'discord', wp: 'WP.03', label: 'Discord', grid: '47.47N 12.66E', status: 'NO SIGNAL', href: '#', icon: 'fa-brands fa-discord', x: 88, y: 52, disabled: true },
  { id: 'secrets', wp: 'WP.04', label: 'Classified Documents', grid: '47.44N 12.61E', status: 'ACTIVE', href: 'secrets.html', icon: 'fa-solid fa-lock', x: 76, y: 76 },
  { id: 'schedule', wp: 'WP.05', label: 'Schedule', grid: '47.38N 12.53E', status: 'ACTIVE', href: 'schedule.html', icon: 'fa-regular fa-calendar-days', x: 50, y: 87 },
  { id: 'about', wp: 'WP.06', label: 'About', grid: '47.33N 12.46E', status: 'ACTIVE', href: 'about.html', icon: 'fa-solid fa-circle-info', x: 24, y: 76 },
  { id: 'instagram', wp: 'WP.07', label: 'Instagram', grid: '47.30N 12.41E', status: 'NO SIGNAL', href: '#', icon: 'fa-brands fa-instagram', x: 12, y: 52, disabled: true },
  { id: 'merch', wp: 'WP.08', label: 'Merch', grid: '-- OFF GRID --', status: 'NO SIGNAL', href: '#', icon: 'fa-solid fa-store', x: 24, y: 27, disabled: true },
];

// ── BUILD WAYPOINT MARKERS ──
const mapFrame = document.getElementById('mapFrame');
const rdWp = document.getElementById('rdWp');
const rdStatus = document.getElementById('rdStatus');
const rdGrid = document.getElementById('rdGrid');
const rdPanel = document.getElementById('wpReadout');

waypoints.forEach(p => {
  const active = !p.disabled;
  const tagClass = active ? 'active' : 'inactive';
  const tagText = active ? 'ACTIVE' : 'INACTIVE';

  const a = document.createElement('a');
  a.className = 'waypoint' + (p.live ? ' live' : '') + (p.disabled ? ' disabled' : '');
  a.style.left = p.x + '%';
  a.style.top  = p.y + '%';
  a.href = p.disabled ? '#' : p.href;
  if (!p.disabled) {
    a.target = p.href.startsWith('http') ? '_blank' : '_self';
    a.rel = 'noopener noreferrer';
  } else {
    // stays hoverable/highlightable, just not navigable
    a.addEventListener('click', e => e.preventDefault());
  }
  a.innerHTML = `
    <div class="wp-marker">
      ${p.live ? '<div class="wp-live-ring"></div>' : ''}
      <i class="${p.icon}"></i>
      <div class="wp-status-dot ${tagClass}"></div>
    </div>
    <span class="wp-id">${p.wp}</span>
    <div class="wp-tooltip">${p.label}<span class="wp-tag ${tagClass}">${tagText}</span></div>
  `;

  a.addEventListener('mouseenter', () => {
    rdWp.textContent = `${p.wp} · ${p.label.toUpperCase()}`;
    rdStatus.textContent = p.status;
    rdStatus.className = 'v' + (p.disabled ? '' : ' amber');
    rdGrid.textContent = p.grid;
    rdPanel.classList.add('active');
  });
  a.addEventListener('mouseleave', () => {
    rdWp.textContent = '— — —';
    rdStatus.textContent = 'AWAITING SELECT';
    rdStatus.className = 'v amber';
    rdGrid.textContent = '— — —';
    rdPanel.classList.remove('active');
  });

  bindCursorHover(a);
  mapFrame.appendChild(a);
});

// ── MAP CANVAS: terrain, radar sweep, patrol route, patrolling jet ──
(function () {
  const canvas = document.getElementById('mapcanvas');
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
    const rng = mulberry32(42);
    terrain = Array.from({ length: 4 }, (_, i) => ({
      cx: rng() * W, cy: rng() * H,
      baseR: 30 + rng() * 30, rings: 4 + Math.floor(rng() * 3),
      seed: 200 + i * 13, gap: 14 + rng() * 6
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
      ctx.strokeStyle = `rgba(125,255,171,${0.1 - ring * (0.08 / rings)})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  function drawTerrain() {
    terrain.forEach(p => contourCluster(p.cx, p.cy, p.baseR, p.rings, p.seed, p.gap));
  }

  function drawRadar(t) {
    const cx = W / 2, cy = H / 2, r = Math.max(W, H) * 0.62;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(125,255,171,0.08)'; ctx.lineWidth = 1; ctx.stroke();
    [0.4, 0.72].forEach(f => {
      ctx.beginPath(); ctx.arc(cx, cy, r * f, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(125,255,171,0.05)'; ctx.stroke();
    });
    const angle = (t * 0.012) % (Math.PI * 2);
    let fillStyle = 'rgba(125,255,171,0.06)';
    if (ctx.createConicGradient) {
      const grad = ctx.createConicGradient(angle, cx, cy);
      grad.addColorStop(0, 'rgba(125,255,171,0.16)');
      grad.addColorStop(0.1, 'rgba(125,255,171,0)');
      grad.addColorStop(1, 'rgba(125,255,171,0)');
      fillStyle = grad;
    }
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, angle, angle + 0.5); ctx.closePath();
    ctx.fillStyle = fillStyle; ctx.fill();
  }

  // Patrol route: connects every waypoint in order, closing the loop.
  function routePoints() {
    return waypoints.map(p => ({ x: (p.x / 100) * W, y: (p.y / 100) * H, disabled: p.disabled }));
  }
  function drawRoute() {
    const pts = routePoints();
    ctx.save();
    ctx.setLineDash([9, 8]);
    ctx.strokeStyle = 'rgba(125,255,171,0.28)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

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

  let s = 0; // patrol progress: integer part = segment index, fraction = progress along it
  const jetTrail = [];
  function drawPatrolJet() {
    const pts = routePoints();
    const n = pts.length;
    s += 0.0016;
    if (s >= n) s -= n;
    const i0 = Math.floor(s);
    const i1 = (i0 + 1) % n;
    const f = s - i0;
    const a = pts[i0], b = pts[i1];
    const x = a.x + (b.x - a.x) * f;
    const y = a.y + (b.y - a.y) * f;
    const heading = Math.atan2(b.y - a.y, b.x - a.x);

    jetTrail.push({ x, y });
    if (jetTrail.length > 40) jetTrail.shift();
    for (let i = 0; i < jetTrail.length; i++) {
      const p = jetTrail[i];
      const al = (i / jetTrail.length) * 0.18;
      ctx.beginPath(); ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(216,245,223,${al})`; ctx.fill();
    }

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(heading);
    drawJetShape(9);
    ctx.fillStyle = 'rgba(255,180,84,0.9)';
    ctx.shadowColor = 'rgba(255,180,84,0.6)';
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.restore();
  }

  let glitchUntil = 0;
  function scheduleGlitch() {
    setTimeout(() => { glitchUntil = performance.now() + 140; scheduleGlitch(); }, 17000 + Math.random() * 20000);
  }
  scheduleGlitch();
  function drawGlitch() {
    if (performance.now() > glitchUntil) return;
    ctx.save(); ctx.globalAlpha = 0.045; ctx.fillStyle = '#7dffab';
    for (let i = 0; i < 6; i++) ctx.fillRect(0, Math.random() * H, W, 2 + Math.random() * 2);
    ctx.restore();
  }

  function resize() {
    const rect = mapFrame.getBoundingClientRect();
    W = canvas.width = rect.width;
    H = canvas.height = rect.height;
    buildTerrain();
  }

  let t = 0;
  function animate() {
    t++;
    ctx.clearRect(0, 0, W, H);
    drawTerrain();
    drawRadar(t);
    drawRoute();
    drawPatrolJet();
    drawGlitch();
    requestAnimationFrame(animate);
  }

  window.addEventListener('resize', resize);
  resize();
  animate();
})();