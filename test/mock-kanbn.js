const TEST_INDEX = {
  name: 'Test Project',
  description: 'Test description',
  columns: {
    'Test Column': [
      'test-task-1'
    ]
  },
  options: {}
};

const TEST_TASK = {
  name: 'Test Task 1',
  description: 'Task ',
  metadata: {},
  subTasks: [],
  relations: [],
  comments: []
};

// Store mock settings and output
const config = {
  output: null,
  initialised: false,
  mainFolderName: 'test',
  index: TEST_INDEX,
  task: TEST_TASK,
  taskExists: false,
  trackedTasks: [],
  untrackedTasks: [],
  archivedTasks: []
};

// Mock Kanbn class
class Kanbn {
  async initialised() {
    return config.initialised;
  }
  async getMainFolder() {
    return config.mainFolderName;
  }
  async initialise(options = {}) {
    config.output = options;
  }
  async getIndex() {
    return config.index;
  }

  async loadIndex() { // Already exists, ensure it's correct
    return config.index;
  }

  async loadAllTrackedTasks() {
    // Return tracked tasks based on the index columns
    let tasks = [];
    for (const column in config.index.columns) {
      tasks = tasks.concat(config.index.columns[column]);
    }
    // Return task objects, not just IDs, assuming a default task structure
    return tasks.map(taskId => ({ ...config.task, id: taskId }));
  }

  async getOptions() {
    return config.index.options || {}; // Return options from mock index
  }

  async getCustomFields() {
    // Return mock custom fields if defined in options, otherwise empty object
    return (config.index.options && config.index.options.customFields) || {};
  }

  async getTaskPath(taskId) {
    return path.join(await this.getMainFolder(), 'tasks', `${taskId}.md`);
  }

  async getTaskFilePath(taskId) {
    return this.getTaskPath(taskId); // Alias for compatibility
  }

  async getIndexPath() {
    return path.join(await this.getMainFolder(), 'index.md');
  }

  async saveIndex(index) {
    config.index = index; // Mock saving
  }

  async saveTask(taskId, taskData) {
    config.task = taskData; // Mock saving
    config.output = { taskId, taskData };
  }

  async deleteTask(taskId) {
    config.output = { taskId }; // Mock deletion
  }

  async moveTask(taskId, columnName) {
    config.output = { taskId, columnName }; // Mock moving
  }

  async findTrackedTasks() {
    return config.trackedTasks;
  }
  async findUntrackedTasks() {
    return config.untrackedTasks;
  }
  async taskExists(taskId) { // Already exists, ensure it's correct
    // Allow specific task IDs to exist for testing purposes if needed
    if (config.existingTaskIds && config.existingTaskIds.includes(taskId)) {
      return true;
    }
    if (!config.taskExists) {
      // Don't throw error by default, just return false for mock flexibility
      // throw new Error(`Mock Error: No task file found with id "${taskId}"`);
      return false;
    }
    return true;
  }
  async getTask(taskId) { // Already exists, ensure it's correct
    if (!await this.taskExists(taskId) && !(config.existingTaskIds && config.existingTaskIds.includes(taskId))) {
       throw new Error(`Mock Error: Task ${taskId} does not exist.`);
    }
    return config.task;
  }
  async loadTask(taskId) { // Already exists, ensure it's correct
    return config.task;
  }
  async findTaskColumn(taskId) {
    return 'Test Column';
  }
  async updateTask(taskId, taskData) {
    config.output = {
      taskId,
      taskData
    };
    return taskId;
  }
  async createTask(taskData, columnName) {
    config.output = {
      taskData,
      columnName
    };
    const newTaskId = 'new-task-' + Math.random().toString(36).substring(7);
    // Simulate adding to index for mock consistency
    if (config.index && config.index.columns && config.index.columns[columnName]) {
        config.index.columns[columnName].push(newTaskId);
    } else if (config.index && config.index.columns) {
        // Handle case where column might not exist in mock index yet
        config.index.columns[columnName] = [newTaskId];
    }
    return newTaskId;
  }
  async addUntrackedTaskToIndex(untrackedTask, columnName) { // Already exists, ensure it's correct
    config.output = {
      untrackedTask,
      columnName
    };
  }
  async listArchivedTasks() {
    return config.archivedTasks;
  }
  async archiveTask(taskId) {
    config.output = {
      taskId
    };
    return taskId;
  }
  async restoreTask(taskId, columnName) {
    config.output = {
      taskId,
      columnName
    };
    return taskId;
  }
  async status() {
    return {
      relationMetrics: {
        parentTasks: 1,
        childTasks: 2
      }
    };
  }

  async burndown(sprints = null, dates = null, assigned = null, columns = null, normalise = null) {
    return config.burndown;
  }

  /**
   * Search for tasks matching specified criteria
   * @param {Object} searchCriteria Criteria to search for
   * @returns {Array} Array of matching tasks with their IDs
   */
  search(searchCriteria = {}) {
    const results = [];
    
    // Simple mock implementation that returns tasks matching name search
    for (const columnName in config.index.columns) {
      for (const taskId of config.index.columns[columnName]) {
        const task = { ...config.task, id: taskId };
        
        // Match by name if specified
        if (searchCriteria.name && task.name) {
          if (task.name.toLowerCase().includes(searchCriteria.name.toLowerCase())) {
            results.push(task);
            continue;
          }
        }
        
        // Match by description if specified
        if (searchCriteria.description && task.description) {
          if (task.description.toLowerCase().includes(searchCriteria.description.toLowerCase())) {
            results.push(task);
            continue;
          }
        }
        
        // If no criteria were specified or other matches failed, add as fallback
        if (Object.keys(searchCriteria).length === 0) {
          results.push(task);
        }
      }
    }
    
    return results;
  }
}

// For backward compatibility
const kanbn = {
  initialised: async () => await new Kanbn().initialised(),
  getMainFolder: async () => await new Kanbn().getMainFolder(),
  initialise: async (options = {}) => await new Kanbn().initialise(options),
  getIndex: async () => await new Kanbn().getIndex(),
  loadIndex: async () => await new Kanbn().loadIndex(),
  getTaskPath: async (taskId) => await new Kanbn().getTaskPath(taskId),
  getTaskFilePath: async (taskId) => await new Kanbn().getTaskFilePath(taskId),
  getIndexPath: async () => await new Kanbn().getIndexPath(),
  saveIndex: async (index) => await new Kanbn().saveIndex(index),
  saveTask: async (taskId, taskData) => await new Kanbn().saveTask(taskId, taskData),
  deleteTask: async (taskId) => await new Kanbn().deleteTask(taskId),
  moveTask: async (taskId, columnName) => await new Kanbn().moveTask(taskId, columnName),
  findTrackedTasks: async () => await new Kanbn().findTrackedTasks(),
  findUntrackedTasks: async () => await new Kanbn().findUntrackedTasks(),
  taskExists: async (taskId) => await new Kanbn().taskExists(taskId),
  getTask: async (taskId) => await new Kanbn().getTask(taskId),
  loadTask: async (taskId) => await new Kanbn().loadTask(taskId),
  findTaskColumn: async (taskId) => await new Kanbn().findTaskColumn(taskId),
  updateTask: async (taskId, taskData) => await new Kanbn().updateTask(taskId, taskData),
  createTask: async (taskData, columnName) => await new Kanbn().createTask(taskData, columnName),
  addUntrackedTaskToIndex: async (untrackedTask, columnName) => await new Kanbn().addUntrackedTaskToIndex(untrackedTask, columnName),
  listArchivedTasks: async () => await new Kanbn().listArchivedTasks(),
  archiveTask: async (taskId) => await new Kanbn().archiveTask(taskId),
  restoreTask: async (taskId, columnName) => await new Kanbn().restoreTask(taskId, columnName),
  status: async () => await new Kanbn().status(),
  burndown: async (sprints, dates, assigned, columns, normalise) => 
    await new Kanbn().burndown(sprints, dates, assigned, columns, normalise),
  search: async (searchCriteria = {}) => await new Kanbn().search(searchCriteria)
};

const kanbnInstance = new Kanbn();

const KanbnConstructor = function() {
  return kanbnInstance;
};

// Export both the Kanbn constructor and the kanbn object for backward compatibility
module.exports = KanbnConstructor;
module.exports.Kanbn = Kanbn; // Export the Kanbn class directly
module.exports.config = config;
module.exports.kanbn = kanbn;
