const { httpGetJson } = require("../util/httpGet");
const { classifyVolatility, classifyBreadth } = require("../util/classify");

async function fetchNseAllIndices() {
  const json = await httpGetJson("https://www.nseindia.com/api/allIndices", {
    Referer: "https://www.nseindia.com/market-data/live-market-indices"
  });
  const list = json?.data;
  if (!Array.isArray(list)) throw new Error("Unexpected NSE allIndices response shape");

  const vixEntry = list.find((d) => d.indexSymbol === "INDIA VIX");
  const niftyEntry = list.find((d) => d.indexSymbol === "NIFTY 50");
  if (!vixEntry || !niftyEntry) throw new Error("Missing INDIA VIX or NIFTY 50 in NSE response");

  return { vixEntry, niftyEntry };
}

async function fetchVixAndBreadth() {
  const { vixEntry, niftyEntry } = await fetchNseAllIndices();

  const vixValue = vixEntry.last;
  const advances = Number(niftyEntry.advances);
  const declines = Number(niftyEntry.declines);

  return {
    vix: {
      key: "vix",
      label: "India VIX",
      raw: { value: vixValue, percentChange: vixEntry.percentChange },
      volatility: classifyVolatility(vixValue)
    },
    breadth: {
      key: "breadth",
      label: "NSE Advances/Declines",
      raw: { advances, declines },
      vote: classifyBreadth(advances, declines)
    }
  };
}

module.exports = { fetchVixAndBreadth };
