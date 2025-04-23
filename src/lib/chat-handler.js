const chatParser = require('./chat-parser');
const ChatContext = require('./chat-context');
const utility = require('../utility');
const eventBus = require('./event-bus');

class ChatHandler {
  constructor(kanbn) {
    this.kanbn = kanbn;
    this.context = new ChatContext();
    this.initializeContext();
  }

  async initializeContext() {
    try {
      const index = await this.kanbn.getIndex();
      this.context.setColumns(index);
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
}

module.exports = ChatHandler;
