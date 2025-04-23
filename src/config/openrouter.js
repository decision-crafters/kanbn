/**
 * OpenRouter API configuration
 * Centralizes all OpenRouter-related configuration settings
 */

/**
 * Get the OpenRouter API key from environment or provided override
 * @param {string|null} apiKeyOverride Optional API key override
 * @returns {string|null} The API key or null if not found
 */
function getApiKey(apiKeyOverride = null) {
  // Debug logging
  if (process.env.DEBUG === 'true') {
    console.log('DEBUG: getApiKey called');
    console.log('DEBUG: apiKeyOverride:', apiKeyOverride ? `${apiKeyOverride.substring(0, 5)}... (${apiKeyOverride.length} chars)` : 'not set');
    console.log('DEBUG: process.env.OPENROUTER_API_KEY:', process.env.OPENROUTER_API_KEY ? `${process.env.OPENROUTER_API_KEY.substring(0, 5)}... (${process.env.OPENROUTER_API_KEY.length} chars)` : 'not set');
  }

  // Use the override if provided, otherwise check environment
  const result = apiKeyOverride || process.env.OPENROUTER_API_KEY || null;

  // Debug logging
  if (process.env.DEBUG === 'true') {
    console.log('DEBUG: getApiKey result:', result ? `${result.substring(0, 5)}... (${result.length} chars)` : 'not set');
  }

  return result;
}

/**
 * Get the OpenRouter model to use
 * @param {string|null} modelOverride Optional model override
 * @returns {string} The model to use
 */
function getModel(modelOverride = null) {
  // Use the model specified in the command line arguments, environment, or default to a cost-effective option
  return modelOverride || process.env.OPENROUTER_MODEL || 'google/gemma-3-4b-it:free';
}

/**
 * Check if streaming responses should be used
 * @returns {boolean} True if streaming should be used
 */
function useStreaming() {
  return process.env.OPENROUTER_STREAM !== 'false';
}

/**
 * Validate that an API key is available
 * @param {string|null} apiKey The API key to validate
 * @returns {boolean} True if the API key is valid
 * @throws {Error} If the API key is not found
 */
function validateApiKey(apiKey) {
  if (!apiKey) {
    throw new Error('OpenRouter API key not found. Please set the OPENROUTER_API_KEY environment variable or use the --api-key option.');
  }
  return true;
}

/**
 * Get the OpenRouter API base URL
 * @returns {string} The API base URL
 */
function getApiBaseUrl() {
  return 'https://openrouter.ai/api/v1';
}

/**
 * Get the OpenRouter API headers
 * @param {string} apiKey The API key to use
 * @returns {Object} The headers to use for API requests
 */
function getApiHeaders(apiKey) {
  return {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://github.com/decision-crafters/kanbn',
    'X-Title': 'Kanbn Project Assistant'
  };
}

module.exports = {
  getApiKey,
  getModel,
  useStreaming,
  validateApiKey,
  getApiBaseUrl,
  getApiHeaders
};
