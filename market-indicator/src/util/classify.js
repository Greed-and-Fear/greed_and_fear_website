const { NEUTRAL_BAND_PERCENT, VIX_THRESHOLD } = require("../config");

function classifyByPercent(percentChange) {
  if (Math.abs(percentChange) <= NEUTRAL_BAND_PERCENT) return 0;
  return percentChange > 0 ? 1 : -1;
}

function classifyVolatility(value) {
  return value > VIX_THRESHOLD ? "VOLATILE" : "STABLE";
}

function classifyBreadth(advances, declines) {
  if (advances === declines) return 0;
  return advances > declines ? 1 : -1;
}

module.exports = { classifyByPercent, classifyVolatility, classifyBreadth };
