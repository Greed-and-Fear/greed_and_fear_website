const VOTE_LABEL = { 1: "BULLISH", "-1": "BEARISH", 0: "NEUTRAL" };
const DIRECTION_ICON = { BULLISH: "🟢", BEARISH: "🔴", NEUTRAL: "⚫" };
const VOLATILITY_LABEL = { VOLATILE: "Volatile", STABLE: "Stable" };

// Direction: majority of the 4 directional signals (NASDAQ, Dow, NSE A/D, GIFT Nifty).
// VIX is intentionally excluded here — it measures volatility, not direction.
function resolveDirection(signals) {
  const bullish = signals.filter((s) => s.vote === 1).length;
  const bearish = signals.filter((s) => s.vote === -1).length;
  const neutral = signals.length - bullish - bearish;

  let call = "NEUTRAL";
  if (bullish >= 3) call = "BULLISH";
  else if (bearish >= 3) call = "BEARISH";

  return {
    call,
    icon: DIRECTION_ICON[call],
    counts: { bullish, bearish, neutral }
  };
}

// Volatility: read off VIX alone, independent of direction.
function resolveVolatility(vixSignal) {
  const state = vixSignal.ok ? vixSignal.volatility : "UNKNOWN";
  return {
    state,
    label: VOLATILITY_LABEL[state] || "Unknown",
    value: vixSignal.ok ? vixSignal.raw.value : null
  };
}

function combine(direction, volatility) {
  const directionLabel = direction.call.charAt(0) + direction.call.slice(1).toLowerCase();
  if (volatility.state === "UNKNOWN") {
    return { label: `${directionLabel}`, icon: direction.icon };
  }
  return {
    label: `${directionLabel} & ${volatility.label}`,
    icon: direction.icon
  };
}

function annotate(signal) {
  if (signal.vote !== undefined) {
    return { ...signal, voteLabel: VOTE_LABEL[signal.vote] };
  }
  return signal;
}

module.exports = { resolveDirection, resolveVolatility, combine, annotate };
