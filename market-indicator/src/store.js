const fs = require("fs");
const path = require("path");
const { LOG_FILE } = require("./config");

function ensureLogFile() {
  const dir = path.dirname(LOG_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(LOG_FILE)) fs.writeFileSync(LOG_FILE, "");
}

function appendRun(run) {
  ensureLogFile();
  fs.appendFileSync(LOG_FILE, JSON.stringify(run) + "\n");
}

function readHistory(limit = 60) {
  ensureLogFile();
  const content = fs.readFileSync(LOG_FILE, "utf8").trim();
  if (!content) return [];
  const lines = content.split("\n").filter(Boolean);
  return lines
    .slice(-limit)
    .map((line) => JSON.parse(line))
    .reverse();
}

function readLatest() {
  const history = readHistory(1);
  return history[0] || null;
}

function updateTodayActualClose(actualNiftyClose, actualCloseSentiment) {
  ensureLogFile();
  const content = fs.readFileSync(LOG_FILE, "utf8").trim();
  if (!content) return 0;
  const lines = content.split("\n").filter(Boolean);
  if (lines.length === 0) return 0;

  const todayStr = new Date().toISOString().slice(0, 10);
  let updatedCount = 0;

  const updatedLines = lines.map((line, idx) => {
    try {
      const item = JSON.parse(line);
      const itemDate = item.timestamp ? item.timestamp.slice(0, 10) : "";
      // If it's from today OR it's the latest record
      if (itemDate === todayStr || idx === lines.length - 1) {
        item.actualCloseSentiment = actualCloseSentiment;
        item.actualNiftyClose = actualNiftyClose;
        item.marketClosedAt = new Date().toISOString();
        updatedCount++;
        return JSON.stringify(item);
      }
    } catch {
      // ignore
    }
    return line;
  });

  fs.writeFileSync(LOG_FILE, updatedLines.join("\n") + "\n");
  return updatedCount;
}

module.exports = { appendRun, readHistory, readLatest, updateTodayActualClose };
