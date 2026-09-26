const https = require("https");
const { BROWSER_USER_AGENT } = require("../config");

function httpGetJson(url, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const headers = Object.assign(
      {
        "User-Agent": BROWSER_USER_AGENT,
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9"
      },
      extraHeaders
    );

    const req = https.get(url, { headers }, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        res.resume();
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      const chunks = [];
      res.on("data", (d) => chunks.push(d));
      res.on("end", () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString()));
        } catch (err) {
          reject(new Error(`Failed to parse JSON from ${url}: ${err.message}`));
        }
      });
    });

    req.on("error", reject);
    req.setTimeout(8000, () => req.destroy(new Error(`Timeout fetching ${url}`)));
  });
}

module.exports = { httpGetJson };
