const cron = require("node-cron");
const { CRON_SCHEDULE, TIMEZONE } = require("./config");
const { runIndicator } = require("./runIndicator");

function startScheduler() {
  cron.schedule(
    CRON_SCHEDULE,
    async () => {
      console.log(`[scheduler] running indicator at ${new Date().toISOString()}`);
      try {
        await runIndicator();
      } catch (err) {
        console.error("[scheduler] run failed:", err);
      }
    },
    { timezone: TIMEZONE }
  );
  console.log(`[scheduler] armed: "${CRON_SCHEDULE}" (${TIMEZONE})`);
}

module.exports = { startScheduler };
