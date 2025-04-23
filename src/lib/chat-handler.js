const chatParser = require('./chat-parser');
const ChatContext = require('./chat-context');
const utility = require('../utility');
const eventBus = require('./event-bus');
const PromptLoader = require('./prompt-loader');
const MemoryManager = require('./memory-manager');

class ChatHandler {
  /**
   * Create a new ChatHandler
   * @param {Object} kanbn The Kanbn instance
   * @param {MemoryManager} memoryManager Optional memory manager instance
   * @param {PromptLoader} promptLoader Optional prompt loader instance
   */
  constructor(kanbn, memoryManager = null, promptLoader = null) {
    this.kanbn = kanbn;
    this.context = new ChatContext();
    this.memoryManager = memoryManager;
    this.promptLoader = promptLoader;
    this.initMode = false;
    this.initializeContext();
  }

  async initializeContext() {
    try {
      // Check if Kanbn is initialized before trying to get the index
      const initialized = await this.kanbn.initialised();
      if (initialized) {
        const index = await this.kanbn.getIndex();
        this.context.setColumns(index);
      } else {
        // If not initialized, just set up an empty context
        console.log('Kanbn not initialized yet, using empty context');
      }
    } catch (error) {
      console.error('Error initializing chat context:', error);
    }
  }

  /**
   * Handle a chat message
   * @param {string} message The user's message
   * @return {Promise<string>} The response message
   */
  async handleMessage(message) {
    const { intent, params } = chatParser.parseMessage(message);

    try {
      switch (intent) {
        case 'createTask':
          return await this.handleCreateTask(params);
        case 'addSubtask':
          return await this.handleAddSubtask(params);
        case 'moveTask':
          return await this.handleMoveTask(params);
        case 'comment':
          return await this.handleComment(params);
        case 'complete':
          return await this.handleComplete(params);
        case 'status':
          return await this.handleStatus();
        default:
          return await this.handleChat(message);
      }
    } catch (error) {
      return `Error: ${error.message}`;
    }
  }

  /**
   * Create a new task
   * @param {string[]} params Command parameters
   * @return {Promise<string>} Response message
   */
  async handleCreateTask(params) {
    const taskName = params[3];
    const taskData = {
      name: taskName,
      description: '',
      metadata: {
        created: new Date(),
        tags: []
      }
    };

    const taskId = await this.kanbn.createTask(taskData, 'Backlog');
    this.context.setLastTask(taskId, taskName);
    eventBus.emit('taskCreated', {
      taskId,
      column: 'Backlog',
      taskData,
      source: 'chat'
    });
    return `Created task "${taskName}" in Backlog`;
  }

  /**
   * Add a subtask to an existing task
   * @param {string[]} params Command parameters
   * @return {Promise<string>} Response message
   */
  async handleAddSubtask(params) {
    const [subtaskText, taskRef] = params;
    const taskId = this.context.resolveTaskReference(taskRef);

    if (!taskId) {
      throw new Error(`Could not find task "${taskRef}"`);
    }

    const task = await this.kanbn.getTask(taskId);
    if (!task.subTasks) {
      task.subTasks = [];
    }

    task.subTasks.push({
      text: subtaskText,
      completed: false
    });

    await this.kanbn.updateTask(taskId, task);
    return `Added subtask "${subtaskText}" to "${task.name}"`;
  }

  /**
   * Move a task to a different column
   * @param {string[]} params Command parameters
   * @return {Promise<string>} Response message
   */
  async handleMoveTask(params) {
    const [taskRef, columnName] = params;
    const taskId = this.context.resolveTaskReference(taskRef);

    if (!taskId) {
      throw new Error(`Could not find task "${taskRef}"`);
    }

    if (!this.context.isValidColumn(columnName)) {
      throw new Error(`Invalid column "${columnName}"`);
    }

    const task = await this.kanbn.getTask(taskId);
    const currentColumn = await this.kanbn.findTaskColumn(taskId);

    if (currentColumn === columnName) {
      return `Task "${task.name}" is already in ${columnName}`;
    }

    await this.kanbn.moveTask(taskId, columnName);
    return `Moved task "${task.name}" to ${columnName}`;
  }

  /**
   * Add a comment to a task
   * @param {string[]} params Command parameters
   * @return {Promise<string>} Response message
   */
  async handleComment(params) {
    const commentText = params[1];
    const taskRef = params[3];
    const taskId = this.context.resolveTaskReference(taskRef);

    if (!taskId) {
      throw new Error(`Could not find task "${taskRef}"`);
    }

    const task = await this.kanbn.getTask(taskId);
    if (!task.comments) {
      task.comments = [];
    }

    task.comments.push({
      date: new Date(),
      text: commentText
    });

    await this.kanbn.updateTask(taskId, task);
    return `Added comment to "${task.name}"`;
  }

  /**
   * Mark a task as complete
   * @param {string[]} params Command parameters
   * @return {Promise<string>} Response message
   */
  async handleComplete(params) {
    const [taskRef] = params;
    const taskId = this.context.resolveTaskReference(taskRef);

    if (!taskId) {
      throw new Error(`Could not find task "${taskRef}"`);
    }

    const task = await this.kanbn.getTask(taskId);
    task.metadata.completed = new Date();

    await this.kanbn.updateTask(taskId, task);
    return `Marked "${task.name}" as complete`;
  }

  /**
   * Show project status
   * @return {Promise<string>} Response message
   */
  async handleStatus() {
    const index = await this.kanbn.getIndex();
    const stats = await this.kanbn.status(true, true, true, null, null);

    let response = `Project: ${index.name}\n`;
    for (const [column, tasks] of Object.entries(index.columns)) {
      response += `\n${column}: ${tasks.length} tasks`;
    }

    if (stats.completedTasks > 0) {
      response += `\n\nCompleted: ${stats.completedTasks} tasks`;
    }

    return response;
  }

  /**
   * Handle general chat (fallback)
   * @param {string} message Original message
   * @return {Promise<string>} Response message
   */
  async handleChat(message) {
    // In test mode, just echo the message
    if (process.env.KANBN_ENV === 'test') {
      return `Test mode response to: ${message}`;
    }

    // If we're in init mode, handle differently
    if (this.initMode) {
      return await this.handleInitChat(message);
    }

    // In production, throw an error to trigger the fallback to OpenRouter API
    // This error will be caught by the chat controller, which will then call the OpenRouter API
    throw new Error('No command matched, falling back to AI chat');
  }

  /**
   * Handle a specific command directly
   * @param {string} command Command name
   * @param {string} args Command arguments
   * @return {Promise<string>} Response message
   */
  async handleCommand(command, args) {
    // Check if we have a handler for this command
    const handlerName = `handle${command.charAt(0).toUpperCase() + command.slice(1)}`;

    if (typeof this[handlerName] === 'function') {
      return await this[handlerName](args);
    } else {
      throw new Error(`Unknown command: ${command}`);
    }
  }

  /**
   * Initialize for AI-powered init
   * @param {string} kanbnFolder The path to the .kanbn folder
   * @return {Promise<void>}
   */
  async initializeForInit(kanbnFolder) {
    this.initMode = true;

    // Create memory manager and prompt loader if not provided
    if (!this.memoryManager) {
      this.memoryManager = new MemoryManager(kanbnFolder);
      await this.memoryManager.loadMemory();
      await this.memoryManager.startNewConversation('init');
    }

    if (!this.promptLoader) {
      this.promptLoader = new PromptLoader(kanbnFolder);
    }
  }

  /**
   * Handle chat messages during initialization
   * @param {string} message The user's message
   * @return {Promise<string>} The response message
   */
  async handleInitChat(message) {
    // In test mode, just echo the message
    if (process.env.KANBN_ENV === 'test') {
      return `Init mode test response to: ${message}`;
    }

    // In production, throw an error to trigger the fallback to OpenRouter API
    throw new Error('No init command matched, falling back to AI chat');
  }

  /**
   * Detect project context from user input
   * @param {string} projectName The project name
   * @param {string} projectDescription The project description
   * @return {Promise<Object>} The detected project context
   */
  async detectProjectContext(projectName, projectDescription) {
    // In test mode, return a mock context
    if (process.env.KANBN_ENV === 'test') {
      return {
        projectType: 'Software Development',
        recommendedColumns: ['Backlog', 'To Do', 'In Progress', 'Review', 'Done'],
        explanation: 'This is a mock project context for testing.'
      };
    }

    // In production, throw an error to trigger the fallback to OpenRouter API
    throw new Error('Detecting project context requires AI, falling back to OpenRouter API');
  }

  /**
   * Calculate Cost of Delay for a task
   * @param {string} taskName The task name
   * @param {string} taskDescription The task description
   * @param {string} classOfService The class of service
   * @return {Promise<Object>} The calculated Cost of Delay
   */
  async calculateCostOfDelay(taskName, taskDescription, classOfService) {
    // In test mode, return a mock calculation
    if (process.env.KANBN_ENV === 'test') {
      return {
        value: 5,
        explanation: 'This is a mock Cost of Delay calculation for testing.'
      };
    }

    // In production, throw an error to trigger the fallback to OpenRouter API
    throw new Error('Calculating Cost of Delay requires AI, falling back to OpenRouter API');
  }

  /**
   * Calculate WSJF (Weighted Shortest Job First) for a task
   * @param {string} taskName The task name
   * @param {string} taskDescription The task description
   * @param {number} costOfDelay The cost of delay
   * @param {number} jobSize The job size
   * @return {Promise<Object>} The calculated WSJF
   */
  async calculateWSJF(taskName, taskDescription, costOfDelay, jobSize) {
    // In test mode, return a mock calculation
    if (process.env.KANBN_ENV === 'test') {
      return {
        value: costOfDelay / jobSize,
        explanation: 'This is a mock WSJF calculation for testing.'
      };
    }

    // In production, throw an error to trigger the fallback to OpenRouter API
    throw new Error('Calculating WSJF requires AI, falling back to OpenRouter API');
  }

  /**
   * Suggest initial tasks for a project
   * @param {string} projectName The project name
   * @param {string} projectDescription The project description
   * @param {string[]} columns The project columns
   * @return {Promise<Array>} The suggested initial tasks
   */
  async suggestInitialTasks(projectName, projectDescription, columns) {
    // In test mode, return mock tasks
    if (process.env.KANBN_ENV === 'test') {
      return [
        {
          name: 'Set up project structure',
          description: 'Create initial project structure and documentation',
          column: columns[0] || 'Backlog',
          tags: ['setup', 'documentation']
        },
        {
          name: 'Define project scope',
          description: 'Define the scope and boundaries of the project',
          column: columns[0] || 'Backlog',
          tags: ['planning']
        }
      ];
    }

    // In production, throw an error to trigger the fallback to OpenRouter API
    throw new Error('Suggesting initial tasks requires AI, falling back to OpenRouter API');
  }
}

module.exports = ChatHandler;
