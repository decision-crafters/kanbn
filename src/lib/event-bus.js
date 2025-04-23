/**
 * Centralized event bus for Kanbn
 * This module provides a shared EventEmitter instance for communication
 * between different parts of the application.
 */

const EventEmitter = require('events');
const util = require('util');

// Create global event bus
const eventBus = new EventEmitter();

// Add debug logging for events
const originalEmit = eventBus.emit;
eventBus.emit = function(event, ...args) {
  // Log the event if DEBUG environment variable is set
  if (process.env.DEBUG && (
    process.env.DEBUG.includes('kanbn:events') ||
    process.env.DEBUG.includes('kanbn:*') ||
    process.env.DEBUG === 'true'
  )) {
    console.log(`[EVENT] ${event}:`, util.inspect(args, { depth: 3, colors: true }));
  }

  // Call the original emit method
  return originalEmit.apply(this, [event, ...args]);
};

module.exports = eventBus;
