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
      const initialized = this.kanbn.initialised ? await this.kanbn.initialised() : false;

      if (initialized) {
        try {
          const index = await this.kanbn.getIndex();
          if (index && typeof index === 'object') {
            this.context.setColumns(index);
          } else {
            console.log('Invalid index returned, using default empty context');
          }
        } catch (indexError) {
          console.log('Error getting index, using default empty context:', indexError.message);
        }
      } else {
        // If not initialized, just set up an empty context
        console.log('Kanbn not initialized yet, using empty context');
      }
    } catch (error) {
      console.error('Error initializing chat context:', error);
      // Continue with empty context
    }
  }

  /**
   * Handle a chat message
   * @param {string} message The user's message
   * @return {Promise<string>} The response message
   * @throws {Error} When no command matches and fallback should be triggered
   */
  async handleMessage(message) {
    const { intent, params } = chatParser.parseMessage(message);

    // Different error handling strategy based on intent type
    if (intent === 'chat') {
      // Let fallback errors bubble up to trigger AI service
      throw new Error('No command matched, falling back to AI chat');
    }

    try {
      switch (intent) {
        // Existing commands
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
        case 'listTasksInColumn':
          return await this.handleListTasksInColumn(params);
        case 'status':
          return await this.handleStatus();

        // New commands
        case 'deleteTask':
          return await this.handleDeleteTask(params);
        case 'searchTasks':
          return await this.handleSearchTasks(params);
        case 'listTasksByTag':
          return await this.handleListTasksByTag(params);
        case 'listTasksByAssignee':
          return await this.handleListTasksByAssignee(params);
        case 'showTaskDetails':
          return await this.handleShowTaskDetails(params);
        case 'showTaskStats':
          return await this.handleShowTaskStats(params);
        case 'addTaskTag':
          return await this.handleAddTaskTag(params);
        case 'removeTaskTag':
          return await this.handleRemoveTaskTag(params);
        case 'assignTask':
          return await this.handleAssignTask(params);
        case 'unassignTask':
          return await this.handleUnassignTask(params);
        case 'updateTaskDescription':
          return await this.handleUpdateTaskDescription(params);

        default:
          throw new Error('No command matched, falling back to AI chat');
      }
    } catch (error) {
      // Only catch errors for recognized commands, not for fallback
      if (intent !== 'chat') {
        return `Error: ${error.message}`;
      }
      throw error;
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
    // Get project statistics
    const stats = await this.kanbn.status(true);
    eventBus.emit('contextQueried', { context: stats });
    return `Project has ${stats.tasks} tasks total: ${Object.entries(stats.columnTasks)
      .map(([column, count]) => `${count} in ${column}`)
      .join(', ')}`;
  }

  /**
   * Delete a task
   * @param {string[]} params Command parameters
   * @return {Promise<string>} Response message
   */
  async handleDeleteTask(params) {
    try {
      // Extract task name from params
      const taskName = params[2];

      // Find the task by name
      const taskId = await this.findTaskByName(taskName);
      if (!taskId) {
        return `Task "${taskName}" not found.`;
      }

      // Delete the task
      await this.kanbn.deleteTask(taskId, true);

      eventBus.emit('taskDeleted', { taskId, taskName });
      return `Task "${taskName}" has been deleted.`;
    } catch (error) {
      console.error('Error deleting task:', error);
      throw new Error(`Failed to delete task: ${error.message}`);
    }
  }

  /**
   * Search for tasks containing a keyword
   * @param {string[]} params Command parameters
   * @return {Promise<string>} Response message with search results
   */
  async handleSearchTasks(params) {
    try {
      // Extract search term from params
      const searchTerm = params[params.length - 1];

      // Search for tasks
      const searchResults = await this.kanbn.search({
        name: searchTerm,
        description: searchTerm
      });

      if (searchResults.length === 0) {
        return `No tasks found containing "${searchTerm}".`;
      }

      // Format and return the tasks
      const taskList = searchResults.map(task =>
        `- ${task.name}${task.description ? ': ' + task.description.split('\n')[0] : ''} (in ${task.column})`
      );

      eventBus.emit('tasksSearched', { searchTerm, resultCount: searchResults.length });

      return `Found ${searchResults.length} tasks containing "${searchTerm}":\n${taskList.join('\n')}`;
    } catch (error) {
      console.error('Error searching tasks:', error);
      throw new Error(`Failed to search tasks: ${error.message}`);
    }
  }

  /**
   * Show details for a specific task
   * @param {string[]} params Command parameters
   * @return {Promise<string>} Response message with task details
   */
  async handleShowTaskDetails(params) {
    try {
      // Extract task name from params
      const taskName = params[params.length - 1];

      // Find the task by name
      const taskId = await this.findTaskByName(taskName);
      if (!taskId) {
        return `Task "${taskName}" not found.`;
      }

      // Get task details
      const task = await this.kanbn.getTask(taskId);
      const column = await this.kanbn.findTaskColumn(taskId);

      // Format task details
      let details = `# ${task.name}\n`;
      details += `**Status**: ${column}\n`;

      if (task.description) {
        details += `\n**Description**:\n${task.description}\n`;
      }

      if (task.metadata) {
        if (task.metadata.created) {
          details += `\n**Created**: ${new Date(task.metadata.created).toLocaleString()}\n`;
        }

        if (task.metadata.assigned) {
          details += `**Assigned to**: ${task.metadata.assigned}\n`;
        }

        if (task.metadata.tags && task.metadata.tags.length > 0) {
          details += `**Tags**: ${task.metadata.tags.join(', ')}\n`;
        }
      }

      if (task.subtasks && task.subtasks.length > 0) {
        details += '\n**Subtasks**:\n';
        task.subtasks.forEach(subtask => {
          details += `- [${subtask.completed ? 'x' : ' '}] ${subtask.text}\n`;
        });
      }

      if (task.relations && task.relations.length > 0) {
        details += '\n**Relations**:\n';
        task.relations.forEach(relation => {
          details += `- ${relation.type} ${relation.task}\n`;
        });
      }

      if (task.comments && task.comments.length > 0) {
        details += '\n**Comments**:\n';
        task.comments.forEach(comment => {
          details += `- **${comment.author}**: ${comment.text}\n`;
        });
      }

      eventBus.emit('taskDetailViewed', { taskId, taskName: task.name });

      return details;
    } catch (error) {
      console.error('Error showing task details:', error);
      throw new Error(`Failed to show task details: ${error.message}`);
    }
  }

  /**
   * List tasks in a specific column
   * @param {string[]} params Command parameters
   * @return {Promise<string>} Response message with list of tasks
   */
  async handleListTasksInColumn(params) {
    try {
      // The column name will be the last parameter captured by the regex
      const columnName = params[params.length - 1];

      // Get the index to check if the column exists
      const index = await this.kanbn.getIndex();

      // Check if the column exists (case-insensitive check)
      const matchingColumn = Object.keys(index.columns).find(
        col => col.toLowerCase() === columnName.toLowerCase()
      );

      if (!matchingColumn) {
        return `Column "${columnName}" doesn't exist. Available columns are: ${Object.keys(index.columns).join(', ')}`;
      }

      // Get task IDs in this column
      const taskIds = index.columns[matchingColumn] || [];

      if (taskIds.length === 0) {
        return `There are no tasks in the ${matchingColumn} column.`;
      }

      // Track how many tasks we failed to load
      let failedTaskCount = 0;

      // Load task details
      const tasks = [];
      for (const taskId of taskIds) {
        try {
          const task = await this.kanbn.getTask(taskId);
          tasks.push({
            id: taskId,
            name: task.name,
            description: task.description
          });
        } catch (error) {
          console.error(`Error loading task ${taskId}:`, error);
          failedTaskCount++;
        }
      }

      // If we failed to load all tasks, try filesystem detection
      if (failedTaskCount === taskIds.length) {
        console.log(`Failed to load all ${taskIds.length} tasks, trying filesystem detection...`);

        try {
          // Look for task files in the tasks directory
          const fs = require('fs');
          const path = require('path');
          const taskFolder = path.join(process.cwd(), '.kanbn', 'tasks');

          if (fs.existsSync(taskFolder)) {
            const taskFiles = fs.readdirSync(taskFolder).filter(file =>
              file.endsWith('.md') &&
              !file.includes('ai-request') &&
              !file.includes('ai-response')
            );

            console.log(`Found ${taskFiles.length} non-system task files in filesystem`);

            if (taskFiles.length > 0) {
              // Load task details from files
              for (const taskFile of taskFiles) {
                try {
                  const taskId = taskFile.replace('.md', '');
                  const taskPath = path.join(taskFolder, taskFile);
                  const taskContent = fs.readFileSync(taskPath, 'utf8');

                  // Simple parsing
                  const nameMatch = taskContent.match(/^# (.+)$/m);
                  const descriptionMatch = taskContent.match(/^# .+\n\n([\s\S]+?)(?:\n\n|$)/m);

                  tasks.push({
                    id: taskId,
                    name: nameMatch ? nameMatch[1] : taskId,
                    description: descriptionMatch ? descriptionMatch[1].trim() : ''
                  });
                } catch (taskError) {
                  console.error(`Error loading task file ${taskFile}:`, taskError);
                }
              }
            }
          }
        } catch (fsError) {
          console.error(`Error reading task directory:`, fsError);
        }
      }

      // If we still have no tasks, return a message
      if (tasks.length === 0) {
        return `There are tasks in the ${matchingColumn} column, but they could not be loaded. Try rebuilding the index with 'kanbn index --rebuild'.`;
      }

      // Format and return the tasks
      const taskList = tasks.map(task => `- ${task.name}${task.description ? ': ' + task.description.split('\n')[0] : ''}`);

      eventBus.emit('tasksListed', { column: matchingColumn, taskCount: tasks.length });

      return `Tasks in ${matchingColumn} (${tasks.length}):\n${taskList.join('\n')}`;
    } catch (error) {
      console.error('Error listing tasks in column:', error);
      throw new Error(`Failed to list tasks: ${error.message}`);
    }
  }

  /**
   * List tasks with a specific tag
   * @param {string[]} params Command parameters
   * @return {Promise<string>} Response message with list of tasks
   */
  async handleListTasksByTag(params) {
    try {
      // Extract tag from params
      const tag = params[params.length - 1];

      // Search for tasks with the tag
      const searchResults = await this.kanbn.search({
        tags: tag
      });

      if (searchResults.length === 0) {
        return `No tasks found with tag "${tag}".`;
      }

      // Format and return the tasks
      const taskList = searchResults.map(task =>
        `- ${task.name}${task.description ? ': ' + task.description.split('\n')[0] : ''} (in ${task.column})`
      );

      eventBus.emit('tasksListedByTag', { tag, resultCount: searchResults.length });

      return `Found ${searchResults.length} tasks with tag "${tag}":\n${taskList.join('\n')}`;
    } catch (error) {
      console.error('Error listing tasks by tag:', error);
      throw new Error(`Failed to list tasks by tag: ${error.message}`);
    }
  }

  /**
   * List tasks assigned to a specific person
   * @param {string[]} params Command parameters
   * @return {Promise<string>} Response message with list of tasks
   */
  async handleListTasksByAssignee(params) {
    try {
      // Extract assignee from params
      const assignee = params[params.length - 1];

      // Search for tasks with the assignee
      const searchResults = await this.kanbn.search({
        assigned: assignee
      });

      if (searchResults.length === 0) {
        return `No tasks assigned to "${assignee}".`;
      }

      // Format and return the tasks
      const taskList = searchResults.map(task =>
        `- ${task.name}${task.description ? ': ' + task.description.split('\n')[0] : ''} (in ${task.column})`
      );

      eventBus.emit('tasksListedByAssignee', { assignee, resultCount: searchResults.length });

      return `Found ${searchResults.length} tasks assigned to "${assignee}":\n${taskList.join('\n')}`;
    } catch (error) {
      console.error('Error listing tasks by assignee:', error);
      throw new Error(`Failed to list tasks by assignee: ${error.message}`);
    }
  }

  /**
   * Add a tag to a task
   * @param {string[]} params Command parameters
   * @return {Promise<string>} Response message
   */
  async handleAddTaskTag(params) {
    try {
      // Extract task name and tag from params
      const taskName = params[2];
      const tag = params[params.length - 1];

      // Find the task by name
      const taskId = await this.findTaskByName(taskName);
      if (!taskId) {
        return `Task "${taskName}" not found.`;
      }

      // Get the task
      const task = await this.kanbn.getTask(taskId);

      // Initialize tags array if it doesn't exist
      if (!task.metadata) {
        task.metadata = {};
      }
      if (!task.metadata.tags) {
        task.metadata.tags = [];
      }

      // Check if tag already exists
      if (task.metadata.tags.includes(tag)) {
        return `Task "${taskName}" already has tag "${tag}".`;
      }

      // Add the tag
      task.metadata.tags.push(tag);

      // Update the task
      await this.kanbn.updateTask(taskId, task);

      eventBus.emit('taskTagAdded', { taskId, taskName, tag });
      return `Added tag "${tag}" to task "${taskName}".`;
    } catch (error) {
      console.error('Error adding tag to task:', error);
      throw new Error(`Failed to add tag to task: ${error.message}`);
    }
  }

  /**
   * Remove a tag from a task
   * @param {string[]} params Command parameters
   * @return {Promise<string>} Response message
   */
  async handleRemoveTaskTag(params) {
    try {
      // Extract tag and task name from params
      const tag = params[1];
      const taskName = params[3];

      // Find the task by name
      const taskId = await this.findTaskByName(taskName);
      if (!taskId) {
        return `Task "${taskName}" not found.`;
      }

      // Get the task
      const task = await this.kanbn.getTask(taskId);

      // Check if the task has tags
      if (!task.metadata || !task.metadata.tags || !task.metadata.tags.includes(tag)) {
        return `Task "${taskName}" doesn't have tag "${tag}".`;
      }

      // Remove the tag
      task.metadata.tags = task.metadata.tags.filter(t => t !== tag);

      // Update the task
      await this.kanbn.updateTask(taskId, task);

      eventBus.emit('taskTagRemoved', { taskId, taskName, tag });
      return `Removed tag "${tag}" from task "${taskName}".`;
    } catch (error) {
      console.error('Error removing tag from task:', error);
      throw new Error(`Failed to remove tag from task: ${error.message}`);
    }
  }

  /**
   * Show details for a specific task
   * @param {string[]} params Command parameters
   * @return {Promise<string>} Response message with task details
   */
  async handleShowTaskDetails(params) {
    try {
      // Extract task name from params
      const taskName = params[params.length - 1];

      // Find the task by name
      const taskId = await this.findTaskByName(taskName);
      if (!taskId) {
        return `Task "${taskName}" not found.`;
      }

      // Get the task
      const task = await this.kanbn.getTask(taskId);

      // Format task details
      let details = `# ${task.name}\n\n`;

      // Add task ID
      details += `**ID**: ${taskId}\n`;

      // Add description if it exists
      if (task.description && task.description.trim()) {
        details += `\n**Description**:\n${task.description}\n`;
      }

      // Add column
      const index = await this.kanbn.getIndex();
      const column = Object.keys(index.columns).find(
        col => index.columns[col] && index.columns[col].includes(taskId)
      );
      if (column) {
        details += `\n**Column**: ${column}\n`;
      }

      // Add created date
      if (task.created) {
        details += `\n**Created**: ${task.created}\n`;
      }

      // Add started date if it exists
      if (task.started) {
        details += `**Started**: ${task.started}\n`;
      }

      // Add completed date if it exists
      if (task.completed) {
        details += `**Completed**: ${task.completed}\n`;
      }

      // Add due date if it exists
      if (task.due) {
        details += `**Due**: ${task.due}\n`;
      }

      // Add assignees if they exist
      if (task.metadata && task.metadata.assigned && task.metadata.assigned.length > 0) {
        details += `\n**Assigned to**: ${task.metadata.assigned.join(', ')}\n`;
      }

      // Add tags if they exist
      if (task.metadata && task.metadata.tags && task.metadata.tags.length > 0) {
        details += `**Tags**: ${task.metadata.tags.join(', ')}\n`;
      }

      // Add subtasks if they exist
      if (task.subtasks && task.subtasks.length > 0) {
        details += '\n**Subtasks**:\n';
        task.subtasks.forEach(subtask => {
          details += `- [${subtask.completed ? 'x' : ' '}] ${subtask.text}\n`;
        });
      }

      // Add relations if they exist
      if (task.relations && task.relations.length > 0) {
        details += '\n**Relations**:\n';
        task.relations.forEach(relation => {
          details += `- ${relation.type} ${relation.task}\n`;
        });
      }

      // Add comments if they exist
      if (task.comments && task.comments.length > 0) {
        details += '\n**Comments**:\n';
        task.comments.forEach(comment => {
          details += `- **${comment.author}**: ${comment.text}\n`;
        });
      }

      eventBus.emit('taskDetailViewed', { taskId, taskName: task.name });

      return details;
    } catch (error) {
      console.error('Error showing task details:', error);
      throw new Error(`Failed to show task details: ${error.message}`);
    }
  }

  /**
   * Delete a task
   * @param {string[]} params Command parameters
   * @return {Promise<string>} Response message
   */
  async handleDeleteTask(params) {
    try {
      // Extract task name from params
      const taskName = params[1];

      // Find the task by name
      const taskId = await this.findTaskByName(taskName);
      if (!taskId) {
        return `Task "${taskName}" not found.`;
      }

      // Delete the task
      await this.kanbn.removeTask(taskId);

      eventBus.emit('taskDeleted', { taskId, taskName });
      return `Task "${taskName}" has been deleted.`;
    } catch (error) {
      console.error('Error deleting task:', error);
      throw new Error(`Failed to delete task: ${error.message}`);
    }
  }

  /**
   * Search for tasks containing a keyword
   * @param {string[]} params Command parameters
   * @return {Promise<string>} Response message with search results
   */
  async handleSearchTasks(params) {
    try {
      // Extract search term from params
      const searchTerm = params[params.length - 1];

      // Search for tasks
      const searchResults = await this.kanbn.search({
        name: searchTerm,
        description: searchTerm,
        operator: 'OR'
      });

      if (searchResults.length === 0) {
        return `No tasks found containing "${searchTerm}".`;
      }

      // Format and return the tasks
      const taskList = searchResults.map(task =>
        `- ${task.name}${task.description ? ': ' + task.description.split('\n')[0] : ''} (in ${task.column})`
      );

      eventBus.emit('tasksSearched', { searchTerm, resultCount: searchResults.length });

      return `Found ${searchResults.length} tasks containing "${searchTerm}":\n${taskList.join('\n')}`;
    } catch (error) {
      console.error('Error searching tasks:', error);
      throw new Error(`Failed to search tasks: ${error.message}`);
    }
  }

  /**
   * Show statistics for tasks in a column
   * @param {string[]} params Command parameters
   * @return {Promise<string>} Response message with task statistics
   */
  async handleShowTaskStats(params) {
    try {
      // Extract column name from params
      const columnName = params[params.length - 1];

      // Get the index to check if the column exists
      const index = await this.kanbn.getIndex();

      // Check if the column exists (case-insensitive check)
      const matchingColumn = Object.keys(index.columns).find(
        col => col.toLowerCase() === columnName.toLowerCase()
      );

      if (!matchingColumn) {
        return `Column "${columnName}" doesn't exist. Available columns are: ${Object.keys(index.columns).join(', ')}`;
      }

      // Get task IDs in this column
      const taskIds = index.columns[matchingColumn] || [];

      if (taskIds.length === 0) {
        return `There are no tasks in the ${matchingColumn} column.`;
      }

      // Count tasks with tags, assignments, and comments
      let tasksWithTags = 0;
      let tasksWithAssignees = 0;
      let tasksWithComments = 0;
      let totalComments = 0;
      let tasksWithSubtasks = 0;
      let totalSubtasks = 0;

      for (const taskId of taskIds) {
        try {
          const task = await this.kanbn.getTask(taskId);

          if (task.metadata && task.metadata.tags && task.metadata.tags.length > 0) {
            tasksWithTags++;
          }

          if (task.metadata && task.metadata.assigned && task.metadata.assigned.length > 0) {
            tasksWithAssignees++;
          }

          if (task.comments && task.comments.length > 0) {
            tasksWithComments++;
            totalComments += task.comments.length;
          }

          if (task.subtasks && task.subtasks.length > 0) {
            tasksWithSubtasks++;
            totalSubtasks += task.subtasks.length;
          }
        } catch (error) {
          console.error(`Error loading task ${taskId}:`, error);
        }
      }

      // Create statistics report
      const stats = [
        `Total tasks: ${taskIds.length}`,
        `Tasks with tags: ${tasksWithTags} (${Math.round(tasksWithTags/taskIds.length*100)}%)`,
        `Tasks with assignees: ${tasksWithAssignees} (${Math.round(tasksWithAssignees/taskIds.length*100)}%)`,
        `Tasks with comments: ${tasksWithComments} (${Math.round(tasksWithComments/taskIds.length*100)}%)`,
        `Total comments: ${totalComments}`,
        `Average comments per task: ${(totalComments/taskIds.length).toFixed(1)}`,
        `Tasks with subtasks: ${tasksWithSubtasks} (${Math.round(tasksWithSubtasks/taskIds.length*100)}%)`,
        `Total subtasks: ${totalSubtasks}`,
        `Average subtasks per task: ${(totalSubtasks/taskIds.length).toFixed(1)}`
      ];

      eventBus.emit('taskStatsViewed', { column: matchingColumn, taskCount: taskIds.length });

      return `Statistics for ${matchingColumn} column:\n${stats.join('\n')}`;
    } catch (error) {
      console.error('Error showing task statistics:', error);
      throw new Error(`Failed to show task statistics: ${error.message}`);
    }
  }

  /**
   * Assign a task to a user
   * @param {string[]} params Command parameters
   * @return {Promise<string>} Response message
   */
  async handleAssignTask(params) {
    try {
      // Extract task name and assignee from params
      const taskName = params[1];
      const assignee = params[params.length - 1];

      // Find the task by name
      const taskId = await this.findTaskByName(taskName);
      if (!taskId) {
        return `Task "${taskName}" not found.`;
      }

      // Get the task
      const task = await this.kanbn.getTask(taskId);

      // Initialize metadata and assigned array if they don't exist
      if (!task.metadata) {
        task.metadata = {};
      }
      if (!task.metadata.assigned) {
        task.metadata.assigned = [];
      }

      // Check if already assigned
      if (task.metadata.assigned.includes(assignee)) {
        return `Task "${taskName}" is already assigned to ${assignee}.`;
      }

      // Add assignee
      task.metadata.assigned.push(assignee);

      // Update the task
      await this.kanbn.updateTask(taskId, task);

      eventBus.emit('taskAssigned', { taskId, taskName, assignee });
      return `Assigned task "${taskName}" to ${assignee}.`;
    } catch (error) {
      console.error('Error assigning task:', error);
      throw new Error(`Failed to assign task: ${error.message}`);
    }
  }

  /**
   * Unassign a user from a task
   * @param {string[]} params Command parameters
   * @return {Promise<string>} Response message
   */
  async handleUnassignTask(params) {
    try {
      // Extract task name and assignee from params
      const taskName = params[1];
      const assignee = params[params.length - 1];

      // Find the task by name
      const taskId = await this.findTaskByName(taskName);
      if (!taskId) {
        return `Task "${taskName}" not found.`;
      }

      // Get the task
      const task = await this.kanbn.getTask(taskId);

      // Check if the task has assignees
      if (!task.metadata || !task.metadata.assigned || !task.metadata.assigned.includes(assignee)) {
        return `Task "${taskName}" is not assigned to ${assignee}.`;
      }

      // Remove assignee
      task.metadata.assigned = task.metadata.assigned.filter(a => a !== assignee);

      // Update the task
      await this.kanbn.updateTask(taskId, task);

      eventBus.emit('taskUnassigned', { taskId, taskName, assignee });
      return `Unassigned ${assignee} from task "${taskName}".`;
    } catch (error) {
      console.error('Error unassigning task:', error);
      throw new Error(`Failed to unassign task: ${error.message}`);
    }
  }

  /**
   * Update task description
   * @param {string[]} params Command parameters
   * @return {Promise<string>} Response message
   */
  async handleUpdateTaskDescription(params) {
    try {
      // Extract task name and new description from params
      const taskName = params[1];
      const description = params.slice(3).join(' ');

      // Find the task by name
      const taskId = await this.findTaskByName(taskName);
      if (!taskId) {
        return `Task "${taskName}" not found.`;
      }

      // Get the task
      const task = await this.kanbn.getTask(taskId);

      // Update the description
      task.description = description;

      // Update the task
      await this.kanbn.updateTask(taskId, task);

      eventBus.emit('taskDescriptionUpdated', { taskId, taskName });
      return `Updated description for task "${taskName}".`;
    } catch (error) {
      console.error('Error updating task description:', error);
      throw new Error(`Failed to update task description: ${error.message}`);
    }
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
   * Find a task ID by task name (performs a case-insensitive search)
   * @param {string} taskName The name of the task to find
   * @return {Promise<string|null>} The task ID if found, or null
   */
  async findTaskByName(taskName) {
    try {
      // First try to find the task as if the name was the task ID
      try {
        await this.kanbn.getTask(taskName);
        return taskName; // If this succeeds, the taskName is a valid taskId
      } catch (error) {
        // Not a direct ID match, continue with search
      }

      // Search by name
      const searchResults = await this.kanbn.search({ name: taskName });

      if (searchResults.length === 0) {
        return null;
      }

      // Look for exact or case-insensitive matches
      for (const task of searchResults) {
        if (task.name === taskName) {
          return task.id; // Exact match
        }
      }

      for (const task of searchResults) {
        if (task.name.toLowerCase() === taskName.toLowerCase()) {
          return task.id; // Case-insensitive match
        }
      }

      // If no exact match found, return the first result as a best guess
      return searchResults[0].id;
    } catch (error) {
      console.error('Error finding task by name:', error);
      return null;
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
