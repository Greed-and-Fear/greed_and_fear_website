module.exports = {
  PORT: process.env.PORT || 4173,
  TIMEZONE: "Asia/Kolkata",
  CRON_SCHEDULE: "0 9 * * 1-5",
  NEUTRAL_BAND_PERCENT: 0.1,
  VIX_THRESHOLD: 15,
  BROWSER_USER_AGENT:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  LOG_FILE: require("path").join(__dirname, "..", "data", "history.jsonl")
};
