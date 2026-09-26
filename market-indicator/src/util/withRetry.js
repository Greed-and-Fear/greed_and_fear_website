async function withRetry(fn, { retries = 2, label = "task" } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      console.warn(`[${label}] attempt ${attempt + 1} failed: ${err.message}`);
    }
  }
  throw lastError;
}

module.exports = { withRetry };
