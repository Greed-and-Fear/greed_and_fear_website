const { httpGetJson } = require("../util/httpGet");
const { classifyByPercent } = require("../util/classify");

async function fetchYahooIndex(symbol, key, label) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol
  )}?interval=1d&range=1d`;
  const json = await httpGetJson(url);
  const meta = json?.chart?.result?.[0]?.meta;
  if (!meta || typeof meta.regularMarketPrice !== "number" || typeof meta.chartPreviousClose !== "number") {
    throw new Error(`Unexpected Yahoo Finance response shape for ${symbol}`);
  }

  const { regularMarketPrice, chartPreviousClose } = meta;
  const percentChange = ((regularMarketPrice - chartPreviousClose) / chartPreviousClose) * 100;

  return {
    key,
    label,
    raw: {
      close: regularMarketPrice,
      previousClose: chartPreviousClose,
      percentChange
    },
    vote: classifyByPercent(percentChange)
  };
}

const fetchNasdaq = () => fetchYahooIndex("^IXIC", "nasdaq", "NASDAQ");
const fetchDow = () => fetchYahooIndex("^DJI", "dow", "Dow Jones");

module.exports = { fetchNasdaq, fetchDow };
