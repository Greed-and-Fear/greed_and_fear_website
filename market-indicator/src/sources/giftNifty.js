const { httpGetJson } = require("../util/httpGet");
const { classifyByPercent } = require("../util/classify");

// NOTE: free-dashboard source, pending client decision on whether to switch
// to an official broker API (e.g. Zerodha Kite Connect) for GIFT Nifty.
async function fetchGiftNifty() {
  const json = await httpGetJson("https://live.giftcitynifty.com/api/gift-nifty");
  if (!json || json.success !== true || typeof json.changePercent !== "number") {
    throw new Error("Unexpected GIFT Nifty response shape");
  }

  return {
    key: "giftNifty",
    label: "GIFT Nifty",
    raw: {
      lastPrice: json.lastPrice,
      close: json.close,
      percentChange: json.changePercent
    },
    vote: classifyByPercent(json.changePercent)
  };
}

module.exports = { fetchGiftNifty };
