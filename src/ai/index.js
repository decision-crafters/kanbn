// src/ai/index.js
// Central abstraction layer for AI provider clients.
// Downstream code should import AI features **only** from this module to
// decouple implementation details and satisfy architectural rule R002.

const OpenRouterClient = require('../lib/openrouter-client');
const OllamaClient = require('../lib/ollama-client');

module.exports = {
  OpenRouterClient,
  OllamaClient,
  /**
   * Helper to pick the default AI client based on env vars.
   * Falls back to OpenRouter if no explicit provider configured.
   */
  getDefaultClient() {
    if (process.env.OLLAMA_HOST) return new OllamaClient();
    return new OpenRouterClient(process.env.OPENROUTER_API_KEY);
  },
};
