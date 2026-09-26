const { withRetry } = require("./util/withRetry");
const { fetchNasdaq, fetchDow } = require("./sources/usMarkets");
const { fetchVixAndBreadth } = require("./sources/nseIndices");
const { fetchGiftNifty } = require("./sources/giftNifty");
const { resolveDirection, resolveVolatility, combine, annotate } = require("./voteEngine");
const { appendRun } = require("./store");

function neutralVoteFallback(key, label, error) {
  return { key, label, raw: null, vote: 0, ok: false, error: error.message };
}

function unknownVolatilityFallback(key, label, error) {
  return { key, label, raw: null, volatility: "UNKNOWN", ok: false, error: error.message };
}

async function safeFetch(key, label, fn) {
  try {
    const result = await withRetry(fn, { retries: 2, label });
    return { ...result, ok: true, error: null };
  } catch (err) {
    console.error(`[${label}] failed after retries: ${err.message}`);
    throw err;
  }
}

async function runIndicator() {
  const [nasdaq, dow, giftNifty, vixAndBreadth] = await Promise.all([
    safeFetch("nasdaq", "NASDAQ", fetchNasdaq).catch((err) => neutralVoteFallback("nasdaq", "NASDAQ", err)),
    safeFetch("dow", "Dow Jones", fetchDow).catch((err) => neutralVoteFallback("dow", "Dow Jones", err)),
    safeFetch("giftNifty", "GIFT Nifty", fetchGiftNifty).catch((err) =>
      neutralVoteFallback("giftNifty", "GIFT Nifty", err)
    ),
    safeFetch("vixAndBreadth", "India VIX / NSE Breadth", fetchVixAndBreadth).catch((err) => ({
      ok: false,
      error: err.message
    }))
  ]);

  // vixAndBreadth is a combined fetch (one NSE call, two signals) — unpack into
  // two independent signal entries, propagating the shared failure if it failed.
  let vix, breadth;
  if (vixAndBreadth.ok) {
    vix = { ...vixAndBreadth.vix, ok: true, error: null };
    breadth = { ...vixAndBreadth.breadth, ok: true, error: null };
  } else {
    const err = new Error(vixAndBreadth.error);
    vix = unknownVolatilityFallback("vix", "India VIX", err);
    breadth = neutralVoteFallback("breadth", "NSE Advances/Declines", err);
  }

  const directionSignals = [nasdaq, dow, breadth, giftNifty].map(annotate);
  const direction = resolveDirection(directionSignals);
  const volatility = resolveVolatility(vix);
  const combined = combine(direction, volatility);

  const signals = [...directionSignals, annotate(vix)];

  const run = {
    timestamp: new Date().toISOString(),
    direction,
    volatility,
    combined,
    signals
  };

  appendRun(run);
  return run;
}

if (require.main === module) {
  runIndicator()
    .then((run) => {
      console.log(JSON.stringify(run, null, 2));
    })
    .catch((err) => {
      console.error("Indicator run failed:", err);
      process.exit(1);
    });
}

module.exports = { runIndicator };
