/* ============================================================
   schedule.js — ORION ops calendar renderer

   EDIT YOUR SCHEDULE HERE.
   Add / remove / change entries in the scheduleData array below
   — that's it. Nothing else in this file needs to change.

   Fields:
     game    -> string, name of the game/stream
     date    -> "YYYY-MM-DD"  (local calendar date of the stream)
     time    -> "HH:MM"       (24hr, LOCAL TIME where you are)
     timezone-> label shown next to the time, e.g. "GMT" or "CET"
     duration-> approx length in minutes (used only for the
                "LIVE" window, defaults to 180 if omitted)
     note    -> optional short string, e.g. "Ranked grind"
     platform-> "twitch" | "youtube"  (controls icon/badge)
   ============================================================ */

const scheduleData = [
  {
    game: "WARDOGS",
    date: "2026-09-11",
    time: "00:00",
    timezone: "SAST",
    duration: 180,
    note: "making millions in WARDOGS :D",
    platform: "twitch"
  },
  {
    game: "Warthunder",
    date: "2026-09-12",
    time: "00:00",
    timezone: "SAST",
    duration: 180,
    note: "doing shit in warthunder :D",
    platform: "twitch"
  },
  {
    game: "WARDOGS",
    date: "2026-09-12",
    time: "01:00",
    timezone: "SAST",
    duration: 180,
    note: "making millions in WARDOGS :D",
    platform: "twitch"
  },
  {
    game: "TBD",
    date: "2026-09-18",
    time: "00:00",
    timezone: "SAST",
    duration: 180,
    note: "TBD",
    platform: "twitch"
  },
  {
    game: "TBD",
    date: "2026-09-19",
    time: "00:00",
    timezone: "SAST",
    duration: 180,
    note: "TBD",
    platform: "twitch"
  },
  {
    game: "TBD",
    date: "2026-09-25",
    time: "00:00",
    timezone: "SAST",
    duration: 180,
    note: "TBD",
    platform: "twitch"
  },
  {
    game: "TBD",
    date: "2026-09-26",
    time: "00:00",
    timezone: "SAST",
    duration: 180,
    note: "TBD",
    platform: "twitch"
  },
];

// ── PAGE CHROME — cursor + ambient terrain/radar background ──
// Same idiom used on every other Orion page, kept self-contained
// here since this page doesn't load Scripts/main.js.
(function () {
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
  document.querySelectorAll('a, button, .cal-cell.has-event').forEach(el => {
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
    const rng = mulberry32(31);
    terrain = Array.from({ length: 4 }, (_, i) => ({
      cx: rng() * W, cy: rng() * H,
      baseR: 40 + rng() * 30, rings: 4 + Math.floor(rng() * 3),
      seed: 400 + i * 13, gap: 16 + rng() * 6
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

  function drawRadar(t) {
    const cx = W / 2, cy = H * 0.4, r = Math.max(W, H) * 0.5;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(125,255,171,0.07)'; ctx.lineWidth = 1; ctx.stroke();
    const angle = (t * 0.01) % (Math.PI * 2);
    let fillStyle = 'rgba(125,255,171,0.05)';
    if (ctx.createConicGradient) {
      const grad = ctx.createConicGradient(angle, cx, cy);
      grad.addColorStop(0, 'rgba(125,255,171,0.12)');
      grad.addColorStop(0.1, 'rgba(125,255,171,0)');
      grad.addColorStop(1, 'rgba(125,255,171,0)');
      fillStyle = grad;
    }
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, angle, angle + 0.5); ctx.closePath();
    ctx.fillStyle = fillStyle; ctx.fill();
  }

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

  let t = 0;
  function animate() {
    t++;
    ctx.clearRect(0, 0, W, H);
    drawTerrain();
    drawRadar(t);
    drawGlitch();
    requestAnimationFrame(animate);
  }
  animate();
})();

// ── OPS CALENDAR ──
(function () {
  const PLATFORM = {
    twitch: { icon: "fa-brands fa-twitch", color: "#9146ff" },
    youtube: { icon: "fa-brands fa-youtube", color: "#ff0000" }
  };
  const MONTH_NAMES = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];

  let entries = [];
  let view = { year: null, month: null };

  function toKey(y, m, d) {
    return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  function parseEntries(raw) {
    return raw.map((e) => {
      const start = new Date(`${e.date}T${e.time}:00`);
      const end = new Date(start.getTime() + (e.duration || 180) * 60000);
      return { ...e, start, end };
    });
  }

  function groupByDate(list) {
    const map = {};
    list.forEach((e) => {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    });
    return map;
  }

  function formatTime(d) {
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  function formatFullDate(d) {
    return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  }

  function typeText(el, text, speed = 28) {
    el.textContent = "";
    let i = 0;
    clearInterval(el._typeTimer);
    el._typeTimer = setInterval(() => {
      el.textContent += text[i];
      i++;
      if (i >= text.length) clearInterval(el._typeTimer);
    }, speed);
  }

  function updateTicker() {
    const now = new Date();
    const el = document.getElementById("ticker-text");
    const upcoming = entries
      .filter((e) => e.end > now)
      .sort((a, b) => a.start - b.start)[0];

    if (!upcoming) {
      typeText(el, "NO OPERATIONS SCHEDULED — STANDING BY");
      return;
    }
    const live = now >= upcoming.start && now <= upcoming.end;
    const text = live
      ? `LIVE NOW: ${upcoming.game.toUpperCase()} — TUNE IN`
      : `NEXT DEPLOYMENT: ${upcoming.game.toUpperCase()} — ${formatFullDate(upcoming.start).toUpperCase()}, ${formatTime(upcoming.start)} ${upcoming.timezone || ""}`;
    typeText(el, text);
  }

  function openDetail(dateKey, dayEntries) {
    const backdrop = document.getElementById("cal-detail-backdrop");
    const dateEl = document.getElementById("cal-detail-date");
    const bodyEl = document.getElementById("cal-detail-body");

    dateEl.textContent = formatFullDate(dayEntries[0].start);
    bodyEl.innerHTML = dayEntries.map((e) => {
      const p = PLATFORM[e.platform] || PLATFORM.twitch;
      const now = new Date();
      const live = now >= e.start && now <= e.end;
      return `
        <div class="cal-detail-entry">
          <i class="${p.icon} cal-detail-icon" style="color:${p.color};"></i>
          <div>
            <div class="cal-detail-game">${e.game}</div>
            <div class="cal-detail-time">${live ? "LIVE NOW · " : ""}${formatTime(e.start)} ${e.timezone || ""}</div>
            ${e.note ? `<div class="cal-detail-note">${e.note}</div>` : ""}
          </div>
        </div>
      `;
    }).join("");

    backdrop.classList.add("open");
  }

  function closeDetail() {
    document.getElementById("cal-detail-backdrop").classList.remove("open");
  }

  function renderCalendar() {
    const { year, month } = view;
    const grid = document.getElementById("cal-grid");
    const title = document.getElementById("cal-title");
    title.textContent = `${MONTH_NAMES[month]} ${year}`;

    const byDate = groupByDate(entries);
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const today = new Date();
    const cells = [];

    for (let i = firstWeekday - 1; i >= 0; i--) {
      cells.push({ day: daysInPrevMonth - i, otherMonth: true, y: month === 0 ? year - 1 : year, m: month === 0 ? 11 : month - 1 });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, otherMonth: false, y: year, m: month });
    }
    while (cells.length % 7 !== 0 || cells.length < 42) {
      const last = cells[cells.length - 1];
      const nextM = last.m === 11 ? 0 : last.m + 1;
      const nextY = last.m === 11 ? last.y + 1 : last.y;
      const dayNum = cells.length - (firstWeekday + daysInMonth) + 1;
      cells.push({ day: dayNum, otherMonth: true, y: nextY, m: nextM });
      if (cells.length >= 42) break;
    }

    grid.innerHTML = cells.map((c) => {
      const key = toKey(c.y, c.m, c.day);
      const dayEntries = byDate[key] || [];
      const isToday = !c.otherMonth &&
        c.y === today.getFullYear() && c.m === today.getMonth() && c.day === today.getDate();

      const classes = ["cal-cell"];
      if (c.otherMonth) classes.push("other-month");
      if (isToday) classes.push("is-today");
      if (dayEntries.length) classes.push("has-event");

      const now = new Date();
      let pillsHtml = "";
      if (dayEntries.length) {
        const shown = dayEntries.slice(0, 2);
        pillsHtml = shown.map((e) => {
          const live = now >= e.start && now <= e.end;
          return `
            <span class="cal-pill ${live ? "is-live" : ""}">
              ${live ? '<span class="cal-live-dot"></span>' : ""}
              <span class="cal-pill-mask"><span class="cal-pill-label">${e.game}</span></span>
            </span>
          `;
        }).join("");
        if (dayEntries.length > shown.length) {
          pillsHtml += `<span class="cal-pill-more">+${dayEntries.length - shown.length} more</span>`;
        }
      }

      return `
        <div class="${classes.join(" ")}" data-key="${key}">
          <span class="cal-daynum">${c.day}</span>
          ${pillsHtml}
        </div>
      `;
    }).join("");

    grid.querySelectorAll(".cal-cell.has-event").forEach((cell) => {
      cell.addEventListener("click", () => {
        const key = cell.getAttribute("data-key");
        openDetail(key, byDate[key]);
      });
    });

    grid.querySelectorAll(".cal-pill-mask").forEach((mask) => {
      const label = mask.querySelector(".cal-pill-label");
      if (!label) return;
      const overflow = label.scrollWidth - mask.clientWidth;
      if (overflow > 2) {
        const dist = overflow + 6;
        const duration = Math.min(10, Math.max(4, dist / 12));
        mask.classList.add("marquee");
        label.style.setProperty("--marquee-dist", `-${dist}px`);
        label.style.setProperty("--marquee-duration", `${duration}s`);
      }
    });
  }

  function changeMonth(delta) {
    let { year, month } = view;
    month += delta;
    if (month < 0) { month = 11; year -= 1; }
    if (month > 11) { month = 0; year += 1; }
    view = { year, month };
    const screen = document.getElementById("ops-screen");
    screen.style.opacity = "0.3";
    setTimeout(() => {
      renderCalendar();
      screen.style.transition = "opacity 0.25s ease";
      screen.style.opacity = "1";
    }, 120);
  }

  function init() {
    entries = parseEntries(typeof scheduleData !== "undefined" ? scheduleData : []);
    const now = new Date();
    view = { year: now.getFullYear(), month: now.getMonth() };

    renderCalendar();
    updateTicker();

    document.getElementById("cal-prev").addEventListener("click", () => changeMonth(-1));
    document.getElementById("cal-next").addEventListener("click", () => changeMonth(1));
    document.getElementById("cal-detail-close").addEventListener("click", closeDetail);
    document.getElementById("cal-detail-backdrop").addEventListener("click", (e) => {
      if (e.target.id === "cal-detail-backdrop") closeDetail();
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();