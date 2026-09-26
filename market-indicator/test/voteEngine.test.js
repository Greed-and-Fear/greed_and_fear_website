const { test, assert } = require("./testUtils");
const { resolveDirection, resolveVolatility, combine, annotate } = require("../src/voteEngine");

function votes(arr) {
  return arr.map((vote, i) => ({ key: `s${i}`, label: `s${i}`, raw: null, vote }));
}

test("resolveDirection: 4 bullish -> BULLISH", () => {
  assert.strictEqual(resolveDirection(votes([1, 1, 1, 1])).call, "BULLISH");
});
test("resolveDirection: 3 bullish 1 bearish -> BULLISH (majority of 4)", () => {
  assert.strictEqual(resolveDirection(votes([1, 1, 1, -1])).call, "BULLISH");
});
test("resolveDirection: 3 bearish 1 bullish -> BEARISH", () => {
  assert.strictEqual(resolveDirection(votes([-1, -1, -1, 1])).call, "BEARISH");
});
test("resolveDirection: 2 bullish / 2 bearish -> NEUTRAL (tie, no majority)", () => {
  assert.strictEqual(resolveDirection(votes([1, 1, -1, -1])).call, "NEUTRAL");
});
test("resolveDirection: all neutral -> NEUTRAL", () => {
  assert.strictEqual(resolveDirection(votes([0, 0, 0, 0])).call, "NEUTRAL");
});
test("resolveDirection: 2 bullish / 2 neutral -> NEUTRAL (2 is not a majority of 4)", () => {
  assert.strictEqual(resolveDirection(votes([1, 1, 0, 0])).call, "NEUTRAL");
});
test("resolveDirection: counts are reported correctly", () => {
  const r = resolveDirection(votes([1, 1, -1, 0]));
  assert.deepStrictEqual(r.counts, { bullish: 2, bearish: 1, neutral: 1 });
});
test("resolveDirection: icon matches call", () => {
  assert.strictEqual(resolveDirection(votes([1, 1, 1, 1])).icon, "🟢");
  assert.strictEqual(resolveDirection(votes([-1, -1, -1, -1])).icon, "🔴");
  assert.strictEqual(resolveDirection(votes([0, 0, 0, 0])).icon, "⚫");
});

test("resolveVolatility: VIX below threshold -> STABLE", () => {
  const r = resolveVolatility({ ok: true, volatility: "STABLE", raw: { value: 12.18 } });
  assert.strictEqual(r.state, "STABLE");
  assert.strictEqual(r.value, 12.18);
});
test("resolveVolatility: VIX above threshold -> VOLATILE", () => {
  const r = resolveVolatility({ ok: true, volatility: "VOLATILE", raw: { value: 22.5 } });
  assert.strictEqual(r.state, "VOLATILE");
});
test("resolveVolatility: failed VIX fetch -> UNKNOWN, value null", () => {
  const r = resolveVolatility({ ok: false });
  assert.strictEqual(r.state, "UNKNOWN");
  assert.strictEqual(r.value, null);
});

test("combine: Bullish + Volatile", () => {
  const direction = { call: "BULLISH", icon: "🟢" };
  const volatility = { state: "VOLATILE", label: "Volatile" };
  assert.strictEqual(combine(direction, volatility).label, "Bullish & Volatile");
});
test("combine: Bearish + Stable", () => {
  const direction = { call: "BEARISH", icon: "🔴" };
  const volatility = { state: "STABLE", label: "Stable" };
  assert.strictEqual(combine(direction, volatility).label, "Bearish & Stable");
});
test("combine: Neutral direction still combines with volatility", () => {
  const direction = { call: "NEUTRAL", icon: "⚫" };
  const volatility = { state: "VOLATILE", label: "Volatile" };
  assert.strictEqual(combine(direction, volatility).label, "Neutral & Volatile");
});

test("annotate: attaches voteLabel for directional signals", () => {
  assert.strictEqual(annotate({ vote: 1 }).voteLabel, "BULLISH");
  assert.strictEqual(annotate({ vote: -1 }).voteLabel, "BEARISH");
  assert.strictEqual(annotate({ vote: 0 }).voteLabel, "NEUTRAL");
});
test("annotate: leaves volatility-only signals (no vote field) untouched", () => {
  const signal = { key: "vix", volatility: "STABLE" };
  assert.deepStrictEqual(annotate(signal), signal);
});
