/**
 * Standardised AI-related error hierarchy for Kanbn.
 *
 * All modules (CLI and MCP) should throw these errors so that
 * callers can map them to appropriate UX / HTTP statuses.
 */

class AiError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}

class ProviderUnavailableError extends AiError {}
class RateLimitError extends AiError {}
class ServiceError extends AiError {}

/**
 * Translate a raw error (from OpenRouter/Ollama/fetch) into
 * the corresponding AiError subclass.
 */
function normaliseAiError(rawErr) {
  const msg = rawErr?.message || String(rawErr);
  if (/rate.?limit/i.test(msg)) return new RateLimitError(msg);
  if (/not available|connection refused|ENOTFOUND|ECONN/i.test(msg)) {
    return new ProviderUnavailableError(msg);
  }
  return new ServiceError(msg);
}

// Export all classes and functions using CommonJS
module.exports = {
  AiError,
  ProviderUnavailableError,
  RateLimitError,
  ServiceError,
  normaliseAiError
};
