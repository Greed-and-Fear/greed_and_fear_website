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

module.exports = { appendRun, readHistory, readLatest };
