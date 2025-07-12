// src/errors/KanbnError.js
// Base class for all domain and infrastructure errors.
// Architectural rule R003: all thrown errors should extend this class.

class KanbnError extends Error {
  /**
   * @param {string} message - human-readable error message
   * @param {object} [options] - additional context
   */
  constructor(message, options = {}) {
    super(message);
    this.name = this.constructor.name;
    this.context = options;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

module.exports = KanbnError;
