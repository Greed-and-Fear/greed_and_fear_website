const { test, assert } = require("./testUtils");
const { classifyByPercent, classifyVolatility, classifyBreadth } = require("../src/util/classify");

test("classifyByPercent: clearly positive -> bullish", () => {
  assert.strictEqual(classifyByPercent(1.5), 1);
});
test("classifyByPercent: clearly negative -> bearish", () => {
  assert.strictEqual(classifyByPercent(-0.8), -1);
});
test("classifyByPercent: inside neutral band (+) -> neutral", () => {
  assert.strictEqual(classifyByPercent(0.05), 0);
});
test("classifyByPercent: inside neutral band (-) -> neutral", () => {
  assert.strictEqual(classifyByPercent(-0.09), 0);
});
test("classifyByPercent: exactly at band edge -> neutral", () => {
  assert.strictEqual(classifyByPercent(0.1), 0);
});
test("classifyByPercent: just past band edge -> bullish", () => {
  assert.strictEqual(classifyByPercent(0.11), 1);
});
test("classifyByPercent: zero -> neutral", () => {
  assert.strictEqual(classifyByPercent(0), 0);
});

test("classifyVolatility: below threshold -> STABLE", () => {
  assert.strictEqual(classifyVolatility(12.18), "STABLE");
});
test("classifyVolatility: above threshold -> VOLATILE", () => {
  assert.strictEqual(classifyVolatility(18.4), "VOLATILE");
});
test("classifyVolatility: exactly at threshold -> STABLE (spec is strictly '>15')", () => {
  assert.strictEqual(classifyVolatility(15), "STABLE");
});

test("classifyBreadth: advances > declines -> bullish", () => {
  assert.strictEqual(classifyBreadth(30, 20), 1);
});
test("classifyBreadth: advances < declines -> bearish", () => {
  assert.strictEqual(classifyBreadth(20, 30), -1);
});
test("classifyBreadth: equal -> neutral", () => {
  assert.strictEqual(classifyBreadth(25, 25), 0);
});
