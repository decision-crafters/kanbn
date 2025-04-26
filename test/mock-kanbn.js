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
  async findTrackedTasks() {
    return config.trackedTasks;
  }
  async findUntrackedTasks() {
    return config.untrackedTasks;
  }
  async taskExists(taskId) {
    if (!config.taskExists) {
      throw new Error(`No task file found with id "${taskId}"`);
    }
    return true;
  }
  async getTask(taskId) {
    return config.task;
  }
  async loadTask(taskId) {
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
    return 'new-task-' + Math.random().toString(36).substring(7);
  }
  async addUntrackedTaskToIndex(untrackedTask, columnName) {
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
