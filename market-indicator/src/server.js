const path = require("path");
const express = require("express");
const { PORT } = require("./config");
const { runIndicator } = require("./runIndicator");
const { readHistory, readLatest } = require("./store");
const { startScheduler } = require("./scheduler");

const app = express();

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.use(express.static(path.join(__dirname, "..", "public")));

app.get(["/api/latest", "/api/premarket/latest"], (req, res) => {
  res.json(readLatest());
});

app.get(["/api/history", "/api/premarket/history"], (req, res) => {
  const limit = Number(req.query.limit) || 60;
  res.json(readHistory(limit));
});

app.all(["/api/run-now", "/api/premarket/run-now"], async (req, res) => {
  try {
    const run = await runIndicator();
    res.json(run);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Market indicator dashboard running at http://localhost:${PORT}`);
  startScheduler();
});
