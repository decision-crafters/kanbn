/**
 * Centralized event bus for Kanbn
 * This module provides a shared EventEmitter instance for communication
 * between different parts of the application.
 */

const EventEmitter = require('events');

// Create global event bus
const eventBus = new EventEmitter();

module.exports = eventBus;
