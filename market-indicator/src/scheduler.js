const cron = require("node-cron");
const { CRON_SCHEDULE_MORNING, CRON_SCHEDULE_CLOSE, CRON_SCHEDULE, TIMEZONE } = require("./config");
const { runIndicator } = require("./runIndicator");
const { fetchNseAllIndices } = require("./sources/nseIndices");
const { updateTodayActualClose } = require("./store");

async function recordMarketClose() {
  console.log(`[scheduler] fetching market close at ${new Date().toISOString()}`);
  try {
    const { niftyEntry } = await fetchNseAllIndices();
    const niftyClose = Number(niftyEntry.last);
    const niftyPctChange = Number(niftyEntry.percentChange);
    const sentiment = (!isNaN(niftyPctChange) && niftyPctChange >= 0) ? "BULLISH" : "BEARISH";

    const actualNiftyClose = {
      close: niftyClose,
      percentChange: niftyPctChange,
      sentiment
    };

    const count = updateTodayActualClose(actualNiftyClose, sentiment);
    console.log(`[scheduler] market close recorded: Nifty 50 = ${niftyClose} (${niftyPctChange}%), Sentiment = ${sentiment}. Updated ${count} session(s).`);
    return { actualNiftyClose, sentiment, count };
  } catch (err) {
    console.error("[scheduler] record market close failed:", err.message);
    throw err;
  }
}

function startScheduler() {
  const morningSchedule = CRON_SCHEDULE_MORNING || CRON_SCHEDULE || "10 9 * * 1-5";
  const closeSchedule = CRON_SCHEDULE_CLOSE || "0 16 * * 1-5";

  // 1. Morning Pre-Market Indicator at 9:10 AM IST (Monday to Friday)
  cron.schedule(
    morningSchedule,
    async () => {
      console.log(`[scheduler] running morning indicator (9:10 AM) at ${new Date().toISOString()}`);
      try {
        await runIndicator();
      } catch (err) {
        console.error("[scheduler] morning run failed:", err);
      }
    },
    { timezone: TIMEZONE }
  );

  // 2. End-of-Day Market Close at 4:00 PM IST (Monday to Friday)
  cron.schedule(
    closeSchedule,
    async () => {
      console.log(`[scheduler] running market close update (4:00 PM) at ${new Date().toISOString()}`);
      try {
        await recordMarketClose();
      } catch (err) {
        console.error("[scheduler] market close run failed:", err);
      }
    },
    { timezone: TIMEZONE }
  );

  console.log(`[scheduler] armed morning run: "${morningSchedule}" (${TIMEZONE})`);
  console.log(`[scheduler] armed market close: "${closeSchedule}" (${TIMEZONE})`);
}

module.exports = { startScheduler, recordMarketClose };

