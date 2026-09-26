const ICONS = {
  trendUp: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/></svg>`,
  trendDown: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7l6 6 4-4 8 8"/><path d="M15 17h6v-6"/></svg>`,
  dash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 12h12"/></svg>`,
  barChart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 20V10M12 20V4M18 20v-7"/></svg>`,
  activity: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h4l3 8 4-16 3 8h4"/></svg>`,
  moon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
  sun: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>`
};

const DIRECTION_TEXT = { BULLISH: "Bullish", BEARISH: "Bearish", NEUTRAL: "Neutral" };
const DIRECTION_CLASS = { BULLISH: "bullish", BEARISH: "bearish", NEUTRAL: "neutral" };
const VOLATILITY_CLASS = { VOLATILE: "volatile", STABLE: "stable", UNKNOWN: "unknown" };
const VOLATILITY_TEXT = { VOLATILE: "Volatile", STABLE: "Stable", UNKNOWN: "Unknown" };

// ---------- Theme ----------
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const btn = document.getElementById("theme-toggle");
  btn.innerHTML = theme === "dark" ? ICONS.sun : ICONS.moon;
  localStorage.setItem("theme", theme);
}
(function initTheme() {
  const saved = localStorage.getItem("theme");
  applyTheme(saved || "light");
})();
document.getElementById("theme-toggle").addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme") || "light";
  applyTheme(current === "dark" ? "light" : "dark");
});

// ---------- Formatting ----------
function formatTime(iso) {
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}
function formatPercent(pct) {
  if (typeof pct !== "number") return "—";
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}
function voteClass(vote) {
  return vote === 1 ? "bullish" : vote === -1 ? "bearish" : "neutral";
}
function voteIconSvg(vote) {
  return vote === 1 ? ICONS.trendUp : vote === -1 ? ICONS.trendDown : ICONS.dash;
}

// ---------- Hero ----------
function renderHero(run) {
  const ring = document.getElementById("hero-ring");
  const ringInner = document.getElementById("hero-ring-inner");
  const value = document.getElementById("hero-value");
  const meta = document.getElementById("hero-meta");
  const lastRunText = document.getElementById("last-run-text");

  if (!run) {
    value.textContent = "No runs yet";
    value.className = "hero-value neutral";
    meta.textContent = "";
    lastRunText.textContent = "No runs yet";
    return;
  }

  const cls = DIRECTION_CLASS[run.direction.call];
  const arcCount =
    run.direction.call === "BULLISH"
      ? run.direction.counts.bullish
      : run.direction.call === "BEARISH"
      ? run.direction.counts.bearish
      : Math.max(run.direction.counts.neutral, 1);
  const arcPercent = (arcCount / 4) * 100;

  const arcVar = `var(--${cls === "neutral" ? "neutral" : cls})`;
  const trackVar = `var(--${cls === "neutral" ? "neutral-track" : cls + "-track"})`;
  ring.style.background = `conic-gradient(${arcVar} 0% ${arcPercent}%, ${trackVar} ${arcPercent}% 100%)`;

  ringInner.className = `hero-ring-inner ${cls}`;
  ringInner.innerHTML = cls === "bullish" ? ICONS.trendUp : cls === "bearish" ? ICONS.trendDown : ICONS.dash;

  value.textContent = run.combined.label;
  value.className = `hero-value ${cls}`;

  const volClass = VOLATILITY_CLASS[run.volatility.state];
  meta.innerHTML = `
    <span>${run.direction.counts.bullish} bullish &middot; ${run.direction.counts.bearish} bearish &middot; ${run.direction.counts.neutral} neutral (of 4 direction signals)</span>
    <span class="badge ${volClass}"><span class="dot"></span>${VOLATILITY_TEXT[run.volatility.state]}${
    run.volatility.value != null ? ` (VIX ${run.volatility.value.toFixed(2)})` : ""
  }</span>
  `;

  lastRunText.innerHTML = `Last run: <b>${formatTime(run.timestamp)} IST</b>`;
}

// ---------- Tiles ----------
function tileSpec(signal) {
  const base = { label: signal.label };
  if (!signal.ok) return { ...base, iconClass: "neutral", icon: ICONS.dash, value: "No data", valueClass: "neutral", sub: signal.error || "fetch failed", error: true };

  switch (signal.key) {
    case "nasdaq":
    case "dow":
    case "giftNifty": {
      const cls = voteClass(signal.vote);
      return {
        ...base,
        iconClass: cls,
        icon: voteIconSvg(signal.vote),
        value: formatPercent(signal.raw.percentChange),
        valueClass: cls,
        sub: signal.raw.close != null ? `Close ${signal.raw.close.toLocaleString("en-IN")}` : ""
      };
    }
    case "breadth":
      return {
        ...base,
        iconClass: "amber",
        icon: ICONS.barChart,
        value: `${signal.raw.advances} / ${signal.raw.declines}`,
        valueClass: "neutral",
        sub: "Advances / Declines"
      };
    case "vix":
      return {
        ...base,
        iconClass: "purple",
        icon: ICONS.activity,
        value: signal.raw.value.toFixed(2),
        valueClass: "purple",
        sub: `${formatPercent(signal.raw.percentChange)} vs prev close`
      };
    default:
      return { ...base, iconClass: "neutral", icon: ICONS.dash, value: "—", valueClass: "neutral", sub: "" };
  }
}

function renderTiles(run) {
  const container = document.getElementById("tiles");
  container.innerHTML = "";
  if (!run) return;

  for (const signal of run.signals) {
    const spec = tileSpec(signal);
    const tile = document.createElement("div");
    tile.className = `tile${signal.ok ? "" : " error"}`;
    tile.innerHTML = `
      <div class="tile-label">
        <span class="tile-icon ${spec.iconClass}">${spec.icon}</span>
        ${spec.label}
      </div>
      <div class="tile-value ${spec.valueClass}">${spec.value}</div>
      <div class="tile-sub">${spec.sub}</div>
    `;
    container.appendChild(tile);
  }
}

// ---------- History ----------
function renderHistory(history) {
  const body = document.getElementById("history-body");
  body.innerHTML = "";
  const directionOrder = ["nasdaq", "dow", "breadth", "giftNifty"];

  for (const run of history) {
    const byKey = Object.fromEntries(run.signals.map((s) => [s.key, s]));
    const dirCls = DIRECTION_CLASS[run.direction.call];
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${formatTime(run.timestamp)}</td>
      <td><span class="row-direction ${dirCls}"><span class="dot"></span>${DIRECTION_TEXT[run.direction.call]}</span></td>
      <td><span class="row-volatility"><span class="dot"></span>${VOLATILITY_TEXT[run.volatility.state]}</span></td>
      ${directionOrder
        .map((key) => {
          const s = byKey[key];
          if (!s || !s.ok) return `<td><span class="vote-icon neutral">${ICONS.dash}</span></td>`;
          const cls = voteClass(s.vote);
          return `<td><span class="vote-icon ${cls}">${voteIconSvg(s.vote)}</span></td>`;
        })
        .join("")}
      <td class="num">${byKey.vix && byKey.vix.ok ? byKey.vix.raw.value.toFixed(2) : "—"}</td>
    `;
    body.appendChild(row);
  }
}

// ---------- Load ----------
async function loadLatest() {
  const run = await fetch("/api/latest").then((r) => r.json());
  renderHero(run);
  renderTiles(run);
}
async function loadHistory() {
  const history = await fetch("/api/history?limit=30").then((r) => r.json());
  renderHistory(history);
}
async function refreshAll() {
  await Promise.all([loadLatest(), loadHistory()]);
}

document.getElementById("refresh").addEventListener("click", async () => {
  const btn = document.getElementById("refresh");
  btn.disabled = true;
  const original = btn.innerHTML;
  btn.innerHTML = "Running&hellip;";
  try {
    await fetch("/api/run-now", { method: "POST" });
    await refreshAll();
  } finally {
    btn.disabled = false;
    btn.innerHTML = original;
  }
});

refreshAll();
