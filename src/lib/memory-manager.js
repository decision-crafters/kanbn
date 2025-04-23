/**
 * Memory Manager for Kanbn
 * Handles loading and saving chat history and context
 */

const fs = require('fs');
const path = require('path');
const util = require('util');

const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const mkdir = util.promisify(fs.mkdir);

class MemoryManager {
  /**
   * Create a new MemoryManager
   * @param {string} kanbnFolder The path to the .kanbn folder
   */
  constructor(kanbnFolder) {
    this.kanbnFolder = kanbnFolder;
    this.memoryFile = path.join(kanbnFolder, 'chat-memory.json');
    this.memory = {
      conversations: [],
      context: {},
      lastUpdated: null
    };
  }

  /**
   * Load memory from disk
   * @returns {Promise<Object>} The loaded memory
   */
  async loadMemory() {
    try {
      if (fs.existsSync(this.memoryFile)) {
        const data = await readFile(this.memoryFile, 'utf8');
        this.memory = JSON.parse(data);
      } else {
        // Initialize with empty memory
        this.memory = {
          conversations: [],
          context: {},
          lastUpdated: new Date().toISOString()
        };
        await this.saveMemory();
      }
      return this.memory;
    } catch (error) {
      console.error('Error loading memory:', error);
      // Return default memory if there's an error
      return {
        conversations: [],
        context: {},
        lastUpdated: new Date().toISOString()
      };
    }
  }

  /**
   * Save memory to disk
   * @returns {Promise<void>}
   */
  async saveMemory() {
    try {
      // Ensure the directory exists
      try {
        await mkdir(this.kanbnFolder, { recursive: true });
      } catch (mkdirError) {
        // Ignore if directory already exists
        if (mkdirError.code !== 'EEXIST') {
          throw mkdirError;
        }
      }

      // Update the lastUpdated timestamp
      this.memory.lastUpdated = new Date().toISOString();

      // Write the memory to disk
      await writeFile(
        this.memoryFile,
        JSON.stringify(this.memory, null, 2),
        'utf8'
      );
    } catch (error) {
      console.error('Error saving memory:', error);
    }
  }

  /**
   * Add a message to the conversation history
   * @param {string} role The role of the message sender ('user' or 'assistant')
   * @param {string} content The message content
   * @param {string} type The type of conversation ('chat' or 'init')
   * @returns {Promise<void>}
   */
  async addMessage(role, content, type = 'chat') {
    // Find the most recent conversation of the specified type
    let conversation = this.memory.conversations.find(c => c.type === type && c.active);

    // If no active conversation of this type exists, create one
    if (!conversation) {
      conversation = {
        id: Date.now().toString(),
        type,
        active: true,
        messages: [],
        created: new Date().toISOString(),
        updated: new Date().toISOString()
      };
      this.memory.conversations.push(conversation);
    }

    // Add the message to the conversation
    conversation.messages.push({
      role,
      content,
      timestamp: new Date().toISOString()
    });

    // Update the conversation's updated timestamp
    conversation.updated = new Date().toISOString();

    // Save the updated memory
    await this.saveMemory();
  }

  /**
   * Get the conversation history for a specific type
   * @param {string} type The type of conversation ('chat' or 'init')
   * @returns {Array} The conversation history
   */
  getConversationHistory(type = 'chat') {
    // Find the most recent conversation of the specified type
    const conversation = this.memory.conversations.find(c => c.type === type && c.active);

    // If no conversation exists, return an empty array
    if (!conversation) {
      return [];
    }

    // Return the messages in the format expected by OpenRouter
    return conversation.messages.map(message => ({
      role: message.role,
      content: message.content
    }));
  }

  /**
   * Update the context with new information
   * @param {Object} newContext The new context information
   * @returns {Promise<void>}
   */
  async updateContext(newContext) {
    // Merge the new context with the existing context
    this.memory.context = {
      ...this.memory.context,
      ...newContext
    };

    // Save the updated memory
    await this.saveMemory();
  }

  /**
   * Get the current context
   * @returns {Object} The current context
   */
  getContext() {
    return this.memory.context;
  }

  /**
   * Start a new conversation
   * @param {string} type The type of conversation ('chat' or 'init')
   * @returns {Promise<void>}
   */
  async startNewConversation(type = 'chat') {
    // Mark all existing conversations of this type as inactive
    this.memory.conversations.forEach(conversation => {
      if (conversation.type === type) {
        conversation.active = false;
      }
    });

    // Create a new conversation
    const newConversation = {
      id: Date.now().toString(),
      type,
      active: true,
      messages: [],
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    };

    // Add the new conversation to the memory
    this.memory.conversations.push(newConversation);

    // Save the updated memory
    await this.saveMemory();
  }

  /**
   * Clear all memory
   * @returns {Promise<void>}
   */
  async clearMemory() {
    this.memory = {
      conversations: [],
      context: {},
      lastUpdated: new Date().toISOString()
    };

    await this.saveMemory();
  }
}

module.exports = MemoryManager;
