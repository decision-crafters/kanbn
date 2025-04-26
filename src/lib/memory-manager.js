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
    
    // Ensure memory file is stored in the .kanbn directory
    // Check if the path already contains .kanbn, otherwise append it
    const kanbnDir = kanbnFolder.endsWith('.kanbn') ? 
      kanbnFolder : 
      path.join(kanbnFolder, '.kanbn');
    
    this.memoryFile = path.join(kanbnDir, 'chat-memory.json');
    
    this.memory = {
      conversations: [],
      context: {},
      taskReferences: {}, // Track task reference history
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
          taskReferences: {},  // Add empty task references structure
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
        taskReferences: {}, // Include task references in default return value
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
      // Get directory path from memory file path
      const dirPath = path.dirname(this.memoryFile);
      console.log(`Saving memory to file: ${this.memoryFile}`);
      console.log(`Directory path: ${dirPath}`);
      
      // Ensure the directory exists
      try {
        console.log(`Creating directory: ${dirPath}`);
        await mkdir(dirPath, { recursive: true });
        console.log('Directory created or already exists');
      } catch (mkdirError) {
        // Ignore if directory already exists
        if (mkdirError.code !== 'EEXIST') {
          console.error(`Error creating directory: ${mkdirError.message}`);
          throw mkdirError;
        }
        console.log('Directory already exists');
      }

      // Update the lastUpdated timestamp
      this.memory.lastUpdated = new Date().toISOString();
      
      // Debug memory contents
      console.log(`Memory contents: Task references: ${Object.keys(this.memory.taskReferences).length}, Conversations: ${this.memory.conversations.length}`);

      // Write the memory to disk
      await writeFile(
        this.memoryFile,
        JSON.stringify(this.memory, null, 2),
        'utf8'
      );
      console.log(`Memory successfully saved to ${this.memoryFile}`);
    } catch (error) {
      console.error(`Error saving memory to ${this.memoryFile}:`, error);
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
      taskReferences: {}, // Include task references when clearing memory
      lastUpdated: new Date().toISOString()
    };

    await this.saveMemory();
  }

  /**
   * Record a task reference in the memory
   * @param {string} taskId The ID of the task being referenced
   * @param {Object} taskData Additional task data to store (name, status, etc.)
   * @param {string} referenceType The type of reference ('view', 'mention', 'update')
   * @returns {Promise<void>}
   */
  async addTaskReference(taskId, taskData = {}, referenceType = 'view') {
    if (!taskId) return;
    
    // Initialize task reference if it doesn't exist
    if (!this.memory.taskReferences[taskId]) {
      this.memory.taskReferences[taskId] = {
        references: [],
        firstReferenced: new Date().toISOString(),
        lastReferenced: new Date().toISOString(),
        data: {}
      };
    }
    
    // Update the task reference
    const taskRef = this.memory.taskReferences[taskId];
    
    // Add the new reference
    taskRef.references.push({
      type: referenceType,
      timestamp: new Date().toISOString(),
      conversationId: this.getActiveConversationId()
    });
    
    // Keep only the last 10 references to prevent unlimited growth
    if (taskRef.references.length > 10) {
      taskRef.references = taskRef.references.slice(-10);
    }
    
    // Update the last referenced timestamp
    taskRef.lastReferenced = new Date().toISOString();
    
    // Merge any new task data
    if (taskData && typeof taskData === 'object') {
      taskRef.data = {
        ...taskRef.data,
        ...taskData
      };
    }
    
    // Save the updated memory
    await this.saveMemory();
  }

  /**
   * Get task reference history
   * @param {string} taskId The ID of the task (optional, if not provided returns all task references)
   * @returns {Object} The task reference history
   */
  getTaskReferences(taskId = null) {
    if (taskId) {
      return this.memory.taskReferences[taskId] || null;
    }
    
    return this.memory.taskReferences;
  }

  /**
   * Check if a task has been previously referenced
   * @param {string} taskId The ID of the task
   * @returns {boolean} Whether the task has been referenced before
   */
  hasTaskBeenReferenced(taskId) {
    return !!this.memory.taskReferences[taskId];
  }

  /**
   * Get the ID of the active conversation
   * @param {string} type The conversation type
   * @returns {string|null} The conversation ID or null if no active conversation
   */
  getActiveConversationId(type = 'chat') {
    const conversation = this.memory.conversations.find(c => c.type === type && c.active);
    return conversation ? conversation.id : null;
  }
}

module.exports = MemoryManager;
