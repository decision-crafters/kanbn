/**
 * AI Logging Module
 * 
 * Handles logging AI interactions and saving them as tasks
 */

const eventBus = require('./event-bus');
const getGitUsername = require('git-user-name');

class AILogging {
  /**
   * Create a new AILogging instance
   * @param {Object} kanbn Kanbn instance
   */
  constructor(kanbn) {
    this.kanbn = kanbn;
  }

  /**
   * Log AI interaction
   * @param {string} boardFolder The board folder path
   * @param {string} type Type of interaction (request/response)
   * @param {Object} data Interaction data
   * @returns {Promise<string|null>} Task ID if created, null otherwise
   */
  async logInteraction(boardFolder, type, data) {
    try {
      const taskId = 'ai-interaction-' + Date.now();
      const username = getGitUsername() || 'unknown';
      const date = new Date();

      const taskData = {
        name: `AI ${type} interaction at ${date.toISOString()}`,
        description: `This is an automatically generated record of an AI interaction.`,
        metadata: {
          created: date,
          updated: date,
          tags: ['ai-interaction', type]
        },
        comments: [
          {
            author: username,
            date: date,
            text: JSON.stringify(data, null, 2)
          }
        ]
      };

      try {
        // Get the index to check if it has columns
        const index = await this.kanbn.getIndex();

        // Initialize index.columns if null or undefined
        if (!index) {
          console.log('Skipping AI interaction logging: Invalid index structure');
          return taskId;
        }

        if (!index.columns) {
          index.columns = { 'Backlog': [] };
          console.log('No columns defined, creating default Backlog column');
        } else if (Object.keys(index.columns).length === 0) {
          index.columns['Backlog'] = [];
          console.log('Empty columns object, creating default Backlog column');
        }

        const createdTaskId = await this.kanbn.createTask(taskData, 'Backlog', true);
        eventBus.emit('taskCreated', {
          taskId: createdTaskId,
          column: 'Backlog',
          taskData,
          source: 'chat'
        });
        eventBus.emit('contextUpdated', { taskId: createdTaskId, type: 'chat' });
        return createdTaskId;
      } catch (createError) {
        console.log('Skipping AI interaction logging:', createError.message);
        eventBus.emit('taskCreationFailed', { error: createError.message });
      }

      return taskId;
    } catch (error) {
      console.error('Error logging AI interaction:', error.message);
      return null;
    }
  }
}

module.exports = AILogging;
