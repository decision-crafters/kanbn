/**
 * @fileoverview Handles serialization and validation of context objects between processes
 * This ensures consistent context handling and improves error reporting
 */

const utility = require('../utility');

/**
 * Class for serializing and deserializing context objects between processes
 */
class ContextSerializer {
  /**
   * Create a standardized context object from various inputs
   * @param {Object} projectContext - Project context object
   * @param {Object} [chatMemory=null] - Chat memory object
   * @param {Object} [options={}] - Additional options
   * @returns {Object} Standardized context object
   */
  static createContextObject(projectContext, chatMemory = null, options = {}) {
    // Create a standardized context object
    const context = {
      version: '1.0',
      timestamp: Date.now(),
      project: null,
      memory: null,
      options,
    };

    // Add project context if available
    if (projectContext) {
      try {
        // Handle tasks which can be either an object (from ProjectContext) or an array
        let tasks = projectContext.tasks || {};

        // If tasks is already an object, keep it as is
        // If it's an array, convert to an object format for consistency
        if (Array.isArray(tasks)) {
          const tasksObj = {};
          tasks.forEach((task) => {
            if (task && task.id) {
              tasksObj[task.id] = task;
            }
          });
          tasks = tasksObj;
        }

        context.project = {
          name: projectContext.name || projectContext.projectName || 'Unknown',
          description: projectContext.description || projectContext.projectDescription || '',
          columns: projectContext.columns || [],
          tasks,
        };
      } catch (error) {
        utility.debugLog(`Error processing project context: ${error.message}`);
        context.project = { error: error.message };
      }
    }

    // Add chat memory if available
    if (chatMemory) {
      try {
        context.memory = {
          conversations: Array.isArray(chatMemory.conversations)
            ? chatMemory.conversations.slice(-10) // Only include recent conversations
            : [],
          metadata: chatMemory.metadata || {},
        };
      } catch (error) {
        utility.debugLog(`Error processing chat memory: ${error.message}`);
        context.memory = { error: error.message };
      }
    }

    return context;
  }

  /**
   * Serialize a context object for passing between processes
   * @param {Object} context - The context object to serialize
   * @returns {string} Serialized context
   */
  static serialize(context) {
    try {
      // Add validation timestamp to track context freshness
      const contextWithMeta = {
        ...context,
        _meta: {
          serializedAt: Date.now(),
          source: process.pid,
        },
      };

      return JSON.stringify(contextWithMeta);
    } catch (error) {
      utility.debugLog(`Error serializing context: ${error.message}`);
      // Return a minimal valid JSON with error information
      return JSON.stringify({
        version: '1.0',
        error: error.message,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Deserialize a context string into an object
   * @param {string} serializedContext - The serialized context string
   * @returns {Object} Deserialized context object
   */
  static deserialize(serializedContext) {
    try {
      // Parse the serialized context
      const context = JSON.parse(serializedContext);

      // Validate the context structure
      if (!context.version) {
        throw new Error('Invalid context format: missing version');
      }

      // Add deserialization metadata
      context._meta = {
        ...(context._meta || {}),
        deserializedAt: Date.now(),
        target: process.pid,
      };

      return context;
    } catch (error) {
      utility.debugLog(`Error deserializing context: ${error.message}`);
      // Return a minimal valid context with error information
      return {
        version: '1.0',
        error: error.message,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Validate a context object and report any issues
   * @param {Object} context - The context object to validate
   * @returns {Object} Validation result {valid: boolean, errors: string[]}
   */
  static validate(context) {
    const errors = [];

    // Check basic structure
    if (!context) errors.push('Context must not be null');
    if (typeof context !== 'object') errors.push('Context must be an object');
    if (!context.version) errors.push('Context must have a version');
    if (!context.timestamp) errors.push('Context must have a timestamp');

    // Validate project context if present
    if (context.project) {
      if (!Array.isArray(context.project.columns)) {
        errors.push('Project columns must be an array');
      }

      // Tasks can be either an object (preferred) or array (legacy)
      if (context.project.tasks) {
        const tasksType = typeof context.project.tasks;
        if (tasksType !== 'object' && !Array.isArray(context.project.tasks)) {
          errors.push(`Project tasks must be an object or array, got ${tasksType}`);
        }
      }
    }

    // Validate memory context if present
    if (context.memory) {
      if (!Array.isArray(context.memory.conversations)) {
        errors.push('Memory conversations must be an array');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

module.exports = ContextSerializer;
