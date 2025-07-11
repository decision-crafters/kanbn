const fs = require("fs");
const path = require("path");
const glob = require("glob-promise");
const parseIndex = require("./parse-index");
const parseTask = require("./parse-task");
const utility = require("./utility");
const yaml = require("yamljs");
const humanizeDuration = require("humanize-duration");
const rimraf = require("rimraf");

const fileUtils = require("./lib/file-utils");
const taskUtils = require("./lib/task-utils");
const filterUtils = require("./lib/filter-utils");
const indexUtils = require("./lib/index-utils");
const statusUtils = require("./lib/status-utils");

const DEFAULT_FOLDER_NAME = ".kanbn";
const DEFAULT_INDEX_FILE_NAME = "index.md";
const DEFAULT_TASKS_FOLDER_NAME = "tasks";
const DEFAULT_ARCHIVE_FOLDER_NAME = "archive";

// Date normalisation intervals measured in milliseconds
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// Default fallback values for index options
const DEFAULT_TASK_WORKLOAD = 2;
const DEFAULT_TASK_WORKLOAD_TAGS = {
  Nothing: 0,
  Tiny: 1,
  Small: 2,
  Medium: 3,
  Large: 5,
  Huge: 8,
};
const DEFAULT_DATE_FORMAT = "d mmm yy, H:MM";
const DEFAULT_TASK_TEMPLATE = "^+^_${overdue ? '^R' : ''}${name}^: ${created ? ('\\n^-^/' + created) : ''}";

/**
 * Default options for the initialise command
 */
const defaultInitialiseOptions = {
  name: "Project Name",
  description: "",
  options: {
    startedColumns: ["In Progress"],
    completedColumns: ["Done"],
  },
  columns: ["Backlog", "Todo", "In Progress", "Done"],
};

/**
 * Get a list of all tracked task ids
 * @param {object} index The index object
 * @param {?string} [columnName=null] The optional column name to filter tasks by
 * @return {Set} A set of task ids appearing in the index
 */
function getTrackedTaskIds(index, columnName = null) {
  return indexUtils.getTrackedTaskIds(index, columnName);
}

/**
   * Get a task path from the id
   * @param {string} tasksPath The path to the tasks folder
   * @param {string} taskId The task id
   * @return {string} The task path
   */
function getTaskPath(tasksPath, taskId) {
  return fileUtils.getTaskPath(tasksPath, taskId);
}

function addFileExtension(taskId) {
  return fileUtils.addFileExtension(taskId);
}

function removeFileExtension(taskId) {
  return fileUtils.removeFileExtension(taskId);
}

function taskInIndex(index, taskId) {
  return taskUtils.taskInIndex(index, taskId);
}

function findTaskColumn(index, taskId) {
  return taskUtils.findTaskColumn(index, taskId);
}

function addTaskToIndex(index, taskId, columnName, position = null) {
  return taskUtils.addTaskToIndex(index, taskId, columnName, position);
}

function removeTaskFromIndex(index, taskId) {
  return taskUtils.removeTaskFromIndex(index, taskId);
}

function renameTaskInIndex(index, taskId, newTaskId) {
  return taskUtils.renameTaskInIndex(index, taskId, newTaskId);
}

function getTaskMetadata(taskData, property) {
  return taskUtils.getTaskMetadata(taskData, property);
}

function setTaskMetadata(taskData, property, value) {
  return taskUtils.setTaskMetadata(taskData, property, value);
}

function taskCompleted(index, task) {
  return taskUtils.taskCompleted(index, task);
}

/**
 * Sort a column in the index
 * @param {object} index The index object
 * @param {object[]} tasks The tasks in the index
 * @param {string} columnName The column to sort
 * @param {object[]} sorters A list of sorter objects
 * @return {object} The modified index object
 */
function sortColumnInIndex(index, tasks, columnName, sorters) {
  return indexUtils.sortColumnInIndex(index, tasks, columnName, sorters);
}

/**
 * Sort a list of tasks
 * @param {object[]} tasks
 * @param {object[]} sorters
 * @return {object[]} The sorted tasks
 */
function sortTasks(tasks, sorters) {
  return indexUtils.sortTasks(tasks, sorters);
}

/**
 * Transform a value using a sort filter regular expression
 * @param {string} value
 * @param {string} filter
 * @return {string} The transformed value
 */
function sortFilter(value, filter) {
  return indexUtils.sortFilter(value, filter);
}

/**
 * Compare two values (supports string, date and number values)
 * @param {any} a
 * @param {any} b
 * @return {number} A positive value if a > b, negative if a < b, otherwise 0
 */
function compareValues(a, b) {
  return indexUtils.compareValues(a, b);
}

/**
 * Filter a list of tasks using a filters object containing field names and filter values
 * @param {object} index
 * @param {object[]}} tasks
 * @param {object} filters
 */
function filterTasks(index, tasks, filters) {
  return indexUtils.filterTasks(index, tasks, filters);
}

/**
 * Check if the input string matches the filter regex
 * @param {string|string[]} filter A regular expression or array of regular expressions
 * @param {string} input The string to match against
 * @return {boolean} True if the input matches the string filter
 */
function stringFilter(filter, input) {
  return filterUtils.stringFilter(filter, input);
}

/**
 * Check if the input date matches a date (ignore time part), or if multiple dates are passed in, check if the
 * input date is between the earliest and latest dates
 * @param {Date|Date[]} dates A date or list of dates to check against
 * @param {Date} input The input date to match against
 * @return {boolean} True if the input matches the date filter
 */
function dateFilter(dates, input) {
  return filterUtils.dateFilter(dates, input);
}

/**
 * Check if the input matches a number, or if multiple numbers are passed in, check if the input is between the
 * minimum and maximum numbers
 * @param {number|number[]} filter A filter number or array of filter numbers
 * @param {number} input The number to match against
 * @return {boolean} True if the input matches the number filter
 */
function numberFilter(filter, input) {
  return filterUtils.numberFilter(filter, input);
}

/**
 * Calculate task workload
 * @param {object} index The index object
 * @param {object} task The task object
 * @return {number} The task workload
 */
function taskWorkload(index, task) {
  return indexUtils.taskWorkload(index, task, DEFAULT_TASK_WORKLOAD, DEFAULT_TASK_WORKLOAD_TAGS);
}

/**
 * Get task progress amount
 * @param {object} index
 * @param {object} task
 * @return {number} Task progress
 */
function taskProgress(index, task) {
  return indexUtils.taskProgress(index, task);
}

/**
 * Calculate task workload statistics between a start and end date
 * @param {object[]} tasks
 * @param {string} metadataProperty
 * @param {Date} start
 * @param {Date} end
 * @return {object} A statistics object
 */
function taskWorkloadInPeriod(tasks, metadataProperty, start, end) {
  return indexUtils.taskWorkloadInPeriod(tasks, metadataProperty, start, end);
}

/**
 * Get a list of tasks that were started before and/or completed after a date
 * @param {object[]} tasks
 * @param {Date} date
 * @return {object[]} A filtered list of tasks
 */
function getActiveTasksAtDate(tasks, date) {
  return indexUtils.getActiveTasksAtDate(tasks, date);
}

/**
 * Calculate the total workload at a specific date
 * @param {object[]} tasks
 * @param {Date} date
 * @return {number} The total workload at the specified date
 */
function getWorkloadAtDate(tasks, date) {
  return indexUtils.getWorkloadAtDate(tasks, date);
}

/**
 * Get the number of tasks that were active at a specific date
 * @param {object[]} tasks
 * @param {Date} date
 * @return {number} The total number of active tasks at the specified date
 */
function countActiveTasksAtDate(tasks, date) {
  return indexUtils.countActiveTasksAtDate(tasks, date);
}

/**
 * Get a list of tasks that were started or completed on a specific date
 * @param {object[]} tasks
 * @param {Date} date
 * @return {object[]} A list of event objects, with event type and task id
 */
function getTaskEventsAtDate(tasks, date) {
  return indexUtils.getTaskEventsAtDate(tasks, date);
}

/**
 * Quantize a burndown chart date to 1-hour resolution
 * @param {Date} date
 * @param {string} resolution One of 'days', 'hours', 'minutes', 'seconds'
 * @return {Date} The quantized dates
 */
function normaliseDate(date, resolution = 'minutes') {
  return indexUtils.normaliseDate(date, resolution);
}

/**
 * If a task's column is linked in the index to a custom field with type date, update the custom field's value
 * in the task data with the current date
 * @param {object} index
 * @param {object} taskData
 * @param {string} columnName
 * @return {object} The updated task data
 */
function updateColumnLinkedCustomFields(index, taskData, columnName) {
  return indexUtils.updateColumnLinkedCustomFields(index, taskData, columnName);
}

/**
 * If index options contains a list of columns linked to a custom field name and a task's column matches one
 * of the columns in this list, set the task's custom field value to the current date depending on criteria:
 * - if 'once', update the value only if it's not currently set
 * - if 'always', update the value regardless
 * - otherwise, don't update the value
 * @param {object} index
 * @param {object} taskData
 * @param {string} columnName
 * @param {string} fieldName
 * @param {string} [updateCriteria='none']
 */
function updateColumnLinkedCustomField(index, taskData, columnName, fieldName, updateCriteria = "none") {
  return indexUtils.updateColumnLinkedCustomField(index, taskData, columnName, fieldName, updateCriteria);
}

class Kanbn {
  ROOT = process.cwd();
  CONFIG_YAML = path.join(this.ROOT, "kanbn.yml");
  CONFIG_JSON = path.join(this.ROOT, "kanbn.json");

  // Memoize config
  configMemo = null;

  constructor(root = null) {
    if(root) {
      this.ROOT = root
      this.CONFIG_YAML = path.join(this.ROOT, "kanbn.yml");
      this.CONFIG_JSON = path.join(this.ROOT, "kanbn.json");
    }
  }

  /**
   * Check if a separate config file exists
   * @returns {Promise<boolean>} True if a config file exists
   */
  async configExists() {
    return await fileUtils.exists(this.CONFIG_YAML) || await fileUtils.exists(this.CONFIG_JSON);
  }

  /**
   * Save configuration data to a separate config file
   */
  async saveConfig(config) {
    if (await fileUtils.exists(this.CONFIG_YAML)) {
      await fs.promises.writeFile(this.CONFIG_YAML, yaml.stringify(config, 4, 2));
    } else {
      await fs.promises.writeFile(this.CONFIG_JSON, JSON.stringify(config, null, 4));
    }
  }

  /**
   * Get configuration settings from the config file if it exists, otherwise return null
   * @return {Promise<Object|null>} Configuration settings or null if there is no separate config file
   */
  async getConfig() {
    if (this.configMemo === null) {
      let config = null;
      if (await fileUtils.exists(this.CONFIG_YAML)) {
        try {
          config = yaml.load(this.CONFIG_YAML);
        } catch (error) {
          throw new Error(`Couldn't load config file: ${error.message}`);
        }
      } else if (await fileUtils.exists(this.CONFIG_JSON)) {
        try {
          config = JSON.parse(await fs.promises.readFile(this.CONFIG_JSON, { encoding: "utf-8" }));
        } catch (error) {
          throw new Error(`Couldn't load config file: ${error.message}`);
        }
      }
      this.configMemo = config;
    }
    return this.configMemo;
  }

  /**
   * Clear cached config
   */
  clearConfigCache() {
    this.configMemo = null;
  }

  /**
   * Get the name of the folder where the index and tasks are stored
   * @return {Promise<string>} The kanbn folder name
   */
  async getFolderName() {
    const config = await this.getConfig();
    if (config !== null && 'mainFolder' in config) {
      return config.mainFolder;
    }
    return DEFAULT_FOLDER_NAME;
  }

  /**
   * Get the index filename
   * @return {Promise<string>} The index filename
   */
  async getIndexFileName() {
    const config = await this.getConfig();
    if (config !== null && 'indexFile' in config) {
      return config.indexFile;
    }
    return DEFAULT_INDEX_FILE_NAME;
  }

  /**
   * Get the name of the folder where tasks are stored
   * @return {Promise<string>} The task folder name
   */
  async getTaskFolderName() {
    const config = await this.getConfig();
    if (config !== null && 'taskFolder' in config) {
      return config.taskFolder;
    }
    return DEFAULT_TASKS_FOLDER_NAME;
  }

  /**
   * Get the name of the archive folder
   * @return {Promise<string>} The archive folder name
   */
  async getArchiveFolderName() {
    const config = await this.getConfig();
    if (config !== null && 'archiveFolder' in config) {
      return config.archiveFolder;
    }
    return DEFAULT_ARCHIVE_FOLDER_NAME;
  }

  /**
   * Get the kanbn folder location for the current working directory
   * @return {Promise<string>} The kanbn folder path
   */
  async getMainFolder() {
    return path.join(this.ROOT, await this.getFolderName());
  }

  /**
   * Get the index path
   * @return {Promise<string>} The kanbn index path
   */
  async getIndexPath() {
    return path.join(await this.getMainFolder(), await this.getIndexFileName());
  }

  /**
   * Get the task folder path
   * @return {Promise<string>} The kanbn task folder path
   */
  async getTaskFolderPath() {
    return path.join(await this.getMainFolder(), await this.getTaskFolderName());
  }

  /**
   * Get the archive folder path
   * @return {Promise<string>} The kanbn archive folder path
   */
  async getArchiveFolderPath() {
    return path.join(await this.getMainFolder(), await this.getArchiveFolderName());
  }

  /**
   * Get the index as an object
   * @return {Promise<index>} The index
   */
  async getIndex() {
    // Check if this folder has been initialised
    if (!(await this.initialised())) {
      throw new Error("Not initialised in this folder");
    }

    return this.loadIndex();
  }

  /**
   * Get a task as an object
   * @param {string} taskId The task id to get
   * @return {Promise<task>} The task
   */
  async getTask(taskId) {
    await this.taskExists(taskId);
    return this.loadTask(taskId);
  }

  /**
   * Add additional index-based information to a task
   * @param {index} index The index object
   * @param {task} task The task object
   * @return {task} The hydrated task
   */
  hydrateTask(index, task) {
    const completed = taskCompleted(index, task);
    task.column = findTaskColumn(index, task.id);
    task.workload = taskWorkload(index, task);

    // Add progress information
    task.progress = taskProgress(index, task);
    task.remainingWorkload = Math.ceil(task.workload * (1 - task.progress));

    // Add due information
    if ("due" in task.metadata) {
      const dueData = {};

      // A task is overdue if it's due date is in the past and the task is not in a completed column
      // or doesn't have a completed dates
      const completedDate = "completed" in task.metadata ? task.metadata.completed : null;

      // Get task due delta - this is the difference between now and the due date, or if the task is completed
      // this is the difference between the completed and due dates
      let delta;
      if (completedDate !== null) {
        delta = completedDate - task.metadata.due;
      } else {
        delta = new Date() - task.metadata.due;
      }

      // Populate due information
      dueData.completed = completed;
      dueData.completedDate = completedDate;
      dueData.dueDate = task.metadata.due;
      dueData.overdue = !completed && delta > 0;
      dueData.dueDelta = delta;

      // Prepare a due message for the task
      let dueMessage = "";
      if (completed) {
        dueMessage += "Completed ";
      }
      dueMessage += `${humanizeDuration(delta, {
        largest: 3,
        round: true,
      })} ${delta > 0 ? "overdue" : "remaining"}`;
      dueData.dueMessage = dueMessage;
      task.dueData = dueData;
    }
    return task;
  }

  /**
   * Return a filtered and sorted list of tasks
   * @param {index} index The index object
   * @param {task[]} tasks A list of task objects
   * @param {object} filters A list of task filters
   * @param {object[]} sorters A list of task sorters
   * @return {object[]} A filtered and sorted list of tasks
   */
  filterAndSortTasks(index, tasks, filters, sorters) {
    return sortTasks(filterTasks(index, tasks, filters), sorters);
  }

  /**
   * Overwrite the index file with the specified data
   * @param {object} indexData Index data to save
   */
  async saveIndex(indexData) {
    return indexUtils.saveIndex(
      indexData,
      this.loadAllTrackedTasks.bind(this),
      this.configExists.bind(this),
      this.saveConfig.bind(this),
      this.getIndexPath.bind(this)
    );
  }

  /**
   * Load the index file and parse it to an object
   * @return {Promise<object>} The index object
   */
  async loadIndex() {
    return indexUtils.loadIndex(
      this.getIndexPath.bind(this),
      this.getConfig.bind(this)
    );
  }

  /**
   * Overwrite a task file with the specified data
   * @param {string} path The task path
   * @param {object} taskData The task data
   */
  async saveTask(path, taskData) {
    await fs.promises.writeFile(path, parseTask.json2md(taskData));
  }

  /**
   * Load a task file and parse it to an object
   * @param {string} taskId The task id
   * @return {Promise<object>} The task object
   */
  async loadTask(taskId) {
    const taskPath = path.join(await this.getTaskFolderPath(), addFileExtension(taskId));
    let taskData = "";
    try {
      taskData = await fs.promises.readFile(taskPath, { encoding: "utf-8" });
    } catch (error) {
      throw new Error(`Couldn't access task file: ${error.message}`);
    }
    const task = parseTask.md2json(taskData);
    // Add the task ID to the task object for easier reference
    task.id = taskId;
    return task;
  }

  /**
   * Load all tracked tasks and return an object with both project tasks and system tasks
   * @param {object} index The index object
   * @param {?string} [columnName=null] The optional column name to filter tasks by
   * @return {Promise<object>} Object containing {projectTasks, systemTasks, allTasks}
   */
  async loadAllTasksWithSeparation(index, columnName = null) {
    const projectTasks = {};
    const systemTasks = {};
    const allTasks = {};

    // Handle empty or undefined index or columns
    if (!index || !index.columns) {
      console.log('Warning: Index or columns is undefined or empty');
      return { projectTasks, systemTasks, allTasks };
    }

    const trackedTasks = getTrackedTaskIds(index, columnName);
    const taskUtils = require('./lib/task-utils');

    // Track how many tasks we failed to load
    let failedTaskCount = 0;
    const totalTaskCount = trackedTasks.size;

    for (let taskId of trackedTasks) {
      try {
        const task = await this.loadTask(taskId);
        allTasks[taskId] = task;

        // Determine if this is a system task
        if (taskUtils.isSystemTask(taskId, task)) {
          systemTasks[taskId] = task;
        } else {
          projectTasks[taskId] = task;
        }
      } catch (error) {
        // Log error but don't fail completely
        console.error(`Could not load task ${taskId}: ${error.message}`);
        failedTaskCount++;
      }
    }

    // If we failed to load most or all tasks, try filesystem detection as a fallback
    if (failedTaskCount > 0 && (totalTaskCount === 0 || failedTaskCount / totalTaskCount > 0.5)) {
      console.log(`Failed to load ${failedTaskCount}/${totalTaskCount} tasks, trying filesystem detection...`);

      try {
        // Look for task files in the tasks directory
        const taskFolder = await this.getTaskFolderPath();
        const taskFiles = await fs.promises.readdir(taskFolder);

        for (const file of taskFiles) {
          if (file.endsWith('.md')) {
            const taskId = file.replace('.md', '');

            // Skip if we already loaded this task successfully
            if (taskId in allTasks) {
              continue;
            }

            try {
              const taskPath = path.join(taskFolder, file);
              const taskContent = await fs.promises.readFile(taskPath, { encoding: 'utf-8' });
              const task = parseTask.md2json(taskContent);

              // Add the task ID to the task object for easier reference
              task.id = taskId;

              // Add to the appropriate collection
              allTasks[taskId] = task;

              if (taskUtils.isSystemTask(taskId, task)) {
                systemTasks[taskId] = task;
              } else {
                projectTasks[taskId] = task;
              }
            } catch (taskError) {
              console.error(`Error loading task file ${file}: ${taskError.message}`);
            }
          }
        }
      } catch (fsError) {
        console.error(`Error reading task directory: ${fsError.message}`);
      }
    }

    return { projectTasks, systemTasks, allTasks };
  }

  /**
   * Enhanced version of loadAllTrackedTasks that handles errors gracefully
   * @param {object} index The index object
   * @param {?string} [columnName=null] The optional column name to filter tasks by
   * @param {boolean} [includeSystemTasks=false] Whether to include system-generated tasks
   * @return {Promise<object>} Object with task data keyed by task ID
   */
  async loadAllTrackedTasks(index, columnName = null, includeSystemTasks = false) {
    try {
      const { projectTasks, systemTasks, allTasks } = await this.loadAllTasksWithSeparation(index, columnName);
      const tasks = includeSystemTasks ? allTasks : projectTasks;
      return Object.values(tasks); // Return array of tasks instead of object
    } catch (error) {
      console.error(`Error loading tasks: ${error.message}`);
      return []; // Return empty array instead of empty object
    }
  }

  /**
   * Load a task file from the archive and parse it to an object
   * @param {string} taskId The task id
   * @return {Promise<object>} The task object
   */
  async loadArchivedTask(taskId) {
    const taskPath = path.join(await this.getArchiveFolderPath(), addFileExtension(taskId));
    let taskData = "";
    try {
      taskData = await fs.promises.readFile(taskPath, { encoding: "utf-8" });
    } catch (error) {
      throw new Error(`Couldn't access archived task file: ${error.message}`);
    }
    return parseTask.md2json(taskData);
  }

  /**
   * Get the date format defined in the index, or the default date format
   * @param {object} index The index object
   * @return {string} The date format
   */
  getDateFormat(index) {
    return "dateFormat" in index.options ? index.options.dateFormat : DEFAULT_DATE_FORMAT;
  }

  /**
   * Get the task template for displaying tasks on the kanbn board from the index, or the default task template
   * @param {object} index The index object
   * @return {string} The task template
   */
  getTaskTemplate(index) {
    return "taskTemplate" in index.options ? index.options.taskTemplate : DEFAULT_TASK_TEMPLATE;
  }

  /**
   * Check if the current working directory has been initialised
   * @return {Promise<boolean>} True if the current working directory has been initialised, otherwise false
   */
  async initialised() {
    return await fileUtils.exists(await this.getIndexPath());
  }

  /**
   * Initialise a kanbn board in the current working directory
   * @param {object} [options={}] Initial columns and other config options
   */
  async initialise(options = {}) {
    // Check if a main folder is defined in an existing config file
    const mainFolder = await this.getMainFolder();

    // Create main folder if it doesn't already exist
    if (!(await fileUtils.exists(mainFolder))) {
      await fs.promises.mkdir(mainFolder, { recursive: true });
    }

    // Create tasks folder if it doesn't already exist
    const taskFolder = await this.getTaskFolderPath();
    if (!(await fileUtils.exists(taskFolder))) {
      await fs.promises.mkdir(taskFolder, { recursive: true });
    }

    // Create index if one doesn't already exist
    let index;
    if (!(await fileUtils.exists(await this.getIndexPath()))) {

      // If config already exists in a separate file, merge it into the options
      const config = await this.getConfig();

      // Create initial options
      const opts = Object.assign({}, defaultInitialiseOptions, options);
      index = {
        name: opts.name,
        description: opts.description,
        options: Object.assign({}, opts.options, config || {}),
        columns: Object.fromEntries(opts.columns.map((columnName) => [columnName, []])),
      };

      // Otherwise, if index already exists and we have specified new settings, re-write the index file
    } else if (Object.keys(options).length > 0) {
      index = await this.loadIndex();
      "name" in options && (index.name = options.name);
      "description" in options && (index.description = options.description);
      "options" in options && (index.options = Object.assign(index.options, options.options));
      "columns" in options &&
        (index.columns = Object.assign(
          index.columns,
          Object.fromEntries(
            options.columns.map((columnName) => [
              columnName,
              columnName in index.columns ? index.columns[columnName] : [],
            ])
          )
        ));
    } else {
      // Index exists but no options provided, just load the existing index
      index = await this.loadIndex();
    }
    
    // Ensure all columns have proper array representation
    if (index && index.columns) {
      for (const column in index.columns) {
        // Make sure each column has at least an empty array
        if (!Array.isArray(index.columns[column])) {
          index.columns[column] = [];
        }
      }
    }
    
    await this.saveIndex(index);
  }

  /**
   * Check if a task file exists and is in the index, otherwise throw an error
   * @param {string} taskId The task id to check
   */
  async taskExists(taskId) {
    // Check if this folder has been initialised
    if (!(await this.initialised())) {
      throw new Error("Not initialised in this folder");
    }

    // Check if the task file exists
    if (!(await fileUtils.exists(getTaskPath(await this.getTaskFolderPath(), taskId)))) {
      throw new Error(`No task file found with id "${taskId}"`);
    }

    // Check that the task is indexed
    let index = await this.loadIndex();
    if (!taskInIndex(index, taskId)) {
      throw new Error(`No task with id "${taskId}" found in the index`);
    }
  }

  /**
   * Get the column that a task is in or throw an error if the task doesn't exist or isn't indexed
   * @param {string} taskId The task id to find
   * @return {Promise<string>} The name of the column the task is in
   */
  async findTaskColumn(taskId) {
    // Check if this folder has been initialised
    if (!(await this.initialised())) {
      throw new Error("Not initialised in this folder");
    }

    // Check if taskId is a string
    if (typeof taskId !== 'string') {
      throw new Error(`Invalid task id: expected string but got ${typeof taskId}`);
    }

    // Check if the task file exists
    if (!(await fileUtils.exists(getTaskPath(await this.getTaskFolderPath(), taskId)))) {
      throw new Error(`No task file found with id "${taskId}"`);
    }

    // Check that the task is indexed
    let index = await this.loadIndex();
    if (!taskInIndex(index, taskId)) {
      throw new Error(`No task with id "${taskId}" found in the index`);
    }

    // Find which column the task is in
    return findTaskColumn(index, taskId);
  }

  /**
   * Create a task file and add the task to the index
   * @param {object} taskData The task object
   * @param {string} columnName The name of the column to add the task to
   * @return {Promise<string>} The id of the task that was created
   */
  async createTask(taskData, columnName) {
    // Check if this folder has been initialised
    if (!(await this.initialised())) {
      throw new Error("Not initialised in this folder");
    }

    // Make sure the task has a name
    if (!taskData.name) {
      throw new Error("Task name cannot be blank");
    }

    // Make sure a task doesn't already exist with the same name
    const taskId = utility.getTaskId(taskData.name);
    const taskPath = getTaskPath(await this.getTaskFolderPath(), taskId);
    if (await fileUtils.exists(taskPath)) {
      throw new Error(`A task with id "${taskId}" already exists`);
    }

    // Get index and make sure the column exists
    let index = await this.loadIndex();
    if (!(columnName in index.columns)) {
      throw new Error(`Column "${columnName}" doesn't exist`);
    }

    // Check that a task with the same id isn't already indexed
    if (taskInIndex(index, taskId)) {
      throw new Error(`A task with id "${taskId}" is already in the index`);
    }

    // Set the created date
    taskData = setTaskMetadata(taskData, "created", new Date());

    // Update task metadata dates
    taskData = updateColumnLinkedCustomFields(index, taskData, columnName);
    await this.saveTask(taskPath, taskData);

    // Add the task to the index
    index = addTaskToIndex(index, taskId, columnName);
    await this.saveIndex(index);
    return taskId;
  }

  /**
   * Add an untracked task to the specified column in the index
   * @param {string} taskId The untracked task id
   * @param {string} columnName The column to add the task to
   * @return {Promise<string>} The id of the task that was added
   */
  async addUntrackedTaskToIndex(taskId, columnName) {
    const index = await this.loadIndex();
    return indexUtils.addUntrackedTaskToIndex(
      index,
      taskId,
      columnName,
      this.initialised.bind(this),
      this.getTaskFolderPath.bind(this),
      this.loadTask.bind(this),
      this.saveTask.bind(this),
      this.saveIndex.bind(this)
    );
  }

  /**
   * Get a list of tracked tasks (i.e. tasks that are listed in the index)
   * @param {?string} [columnName=null] The optional column name to filter tasks by
   * @return {Promise<Set>} A set of task ids
   */
  async findTrackedTasks(columnName = null) {
    const index = await this.loadIndex();
    return indexUtils.findTrackedTasks(
      index,
      this.initialised.bind(this),
      columnName
    );
  }

  /**
   * Get a list of untracked tasks (i.e. markdown files in the tasks folder that aren't listed in the index)
   * @return {Promise<Set>} A set of untracked task ids
   */
  async findUntrackedTasks() {
    const index = await this.loadIndex();
    return indexUtils.findUntrackedTasks(
      index,
      this.initialised.bind(this),
      this.getTaskFolderPath.bind(this)
    );
  }

  /**
   * Update an existing task
   * @param {string} taskId The id of the task to update
   * @param {object} taskData The new task data
   * @param {?string} [columnName=null] The column name to move this task to, or null if not moving this task
   * @return {Promise<string>} The id of the task that was updated
   */
  async updateTask(taskId, taskData, columnName = null) {
    const index = await this.loadIndex();
    return indexUtils.updateTask(
      index,
      taskId,
      taskData,
      columnName,
      this.initialised.bind(this),
      this.getTaskFolderPath.bind(this),
      this.loadTask.bind(this),
      this.saveTask.bind(this),
      this.renameTask.bind(this),
      this.moveTask.bind(this),
      this.saveIndex.bind(this)
    );
  }

  /**
   * Change a task name, rename the task file and update the task id in the index
   * @param {string} taskId The id of the task to rename
   * @param {string} newTaskName The new task name
   * @return {Promise<string>} The new id of the task that was renamed
   */
  async renameTask(taskId, newTaskName) {
    const index = await this.loadIndex();
    return indexUtils.renameTask(
      index,
      taskId,
      newTaskName,
      this.initialised.bind(this),
      this.getTaskFolderPath.bind(this),
      this.loadTask.bind(this),
      this.saveTask.bind(this),
      this.saveIndex.bind(this)
    );
  }

  /**
   * Move a task from one column to another column
   * @param {string} taskId The task id to move
   * @param {string} columnName The name of the column that the task will be moved to
   * @param {?number} [position=null] The position to move the task to within the target column
   * @param {boolean} [relative=false] Treat the position argument as relative instead of absolute
   * @return {Promise<string>} The id of the task that was moved
   */
  async moveTask(taskId, columnName, position = null, relative = false) {
    const index = await this.loadIndex();
    return indexUtils.moveTask(
      index,
      taskId,
      columnName,
      position,
      relative,
      this.initialised.bind(this),
      this.getTaskFolderPath.bind(this),
      this.loadTask.bind(this),
      this.saveTask.bind(this),
      this.saveIndex.bind(this)
    );
  }

  /**
   * Remove a task from the index and optionally delete the task file as well
   * @param {string} taskId The id of the task to remove
   * @param {boolean} [removeFile=false] True if the task file should be removed
   * @return {Promise<string>} The id of the task that was deleted
   */
  async deleteTask(taskId, removeFile = false) {
    // Check if this folder has been initialised
    if (!(await this.initialised())) {
      throw new Error("Not initialised in this folder");
    }
    const index = await this.loadIndex();
    return indexUtils.deleteTask(
      index,
      taskId,
      removeFile,
      this.initialised.bind(this),
      this.getTaskFolderPath.bind(this),
      this.saveIndex.bind(this)
    );
  }

  /**
   * Search for indexed tasks
   * @param {object} [filters={}] The filters to apply
   * @param {boolean} [quiet=false] Only return task ids if true, otherwise return full task details
   * @return {Promise<object[]>} A list of tasks that match the filters
   */
  async search(filters = {}, quiet = false) {
    const index = await this.loadIndex();
    return indexUtils.search(
      index,
      filters,
      quiet,
      this.initialised.bind(this),
      this.loadAllTrackedTasks.bind(this),
      this.hydrateTask.bind(this)
    );
  }

  /**
   * Output project status information
   * @param {boolean} [quiet=false] Output full or partial status information
   * @param {boolean} [untracked=false] Show a list of untracked tasks
   * @param {boolean} [due=false] Show information about overdue tasks and time remaining
   * @param {?string|?number} [sprint=null] The sprint name or number to show stats for, or null for current sprint
   * @param {?Date[]} [dates=null] The date(s) to show stats for, or null for no date filter
   * @return {Promise<object|string[]>} Project status information as an object, or an array of untracked task filenames
   */
  async status(quiet = false, untracked = false, due = false, sprint = null, dates = null) {
    // Check if this folder has been initialised
    if (!(await this.initialised())) {
      throw new Error("Not initialised in this folder");
    }

    // Get index and column names
    const index = await this.loadIndex();
    const columnNames = Object.keys(index.columns);

    // Prepare output
    const result = {
      name: index.name,
    };

    // Get un-tracked tasks if required
    if (untracked) {
      result.untrackedTasks = [...(await this.findUntrackedTasks())].map((taskId) => `${taskId}.md`);

      // If output is quiet, output a list of untracked task filenames
      if (quiet) {
        return result.untrackedTasks;
      }
    }

    // Get basic project status information
    result.tasks = columnNames.reduce((a, v) => a + index.columns[v].length, 0);
    result.columnTasks = Object.fromEntries(
      columnNames.map((columnName) => [columnName, index.columns[columnName].length])
    );
    if ("startedColumns" in index.options && index.options.startedColumns.length > 0) {
      result.startedTasks = Object.entries(index.columns)
        .filter((c) => index.options.startedColumns.indexOf(c[0]) > -1)
        .reduce((a, c) => a + c[1].length, 0);
    }
    if ("completedColumns" in index.options && index.options.completedColumns.length > 0) {
      result.completedTasks = Object.entries(index.columns)
        .filter((c) => index.options.completedColumns.indexOf(c[0]) > -1)
        .reduce((a, c) => a + c[1].length, 0);
    }

    // If required, load more detailed task information
    if (!quiet) {
      // Load all tracked tasks and hydrate them
      const rawTasks = await this.loadAllTrackedTasks(index);
      const tasks = [...rawTasks].map((task) => this.hydrateTask(index, task));

      // If showing due information, calculate time remaining or overdue time for each task
      if (due) {
        result.dueTasks = statusUtils.calculateDueTasks(tasks);
      }

      // Calculate total and per-column workload
      const workloadStats = statusUtils.calculateColumnWorkloads(tasks, columnNames);
      result.totalWorkload = workloadStats.totalWorkload;
      result.totalRemainingWorkload = workloadStats.totalRemainingWorkload;
      result.columnWorkloads = workloadStats.columnWorkloads;
      result.taskWorkloads = statusUtils.calculateTaskWorkloads(index, tasks);

      // Calculate assigned task totals and workloads
      const assignedTasks = statusUtils.calculateAssignedTaskStats(tasks);
      if (Object.keys(assignedTasks).length > 0) {
        result.assigned = assignedTasks;
      }

      // Calculate AI interaction metrics
      const aiMetrics = statusUtils.calculateAIMetrics(tasks);
      if (aiMetrics) {
        result.aiMetrics = aiMetrics;
      }

      // Calculate parent-child relationship metrics
      const relationMetrics = statusUtils.calculateRelationMetrics(tasks);
      if (relationMetrics) {
        result.relationMetrics = relationMetrics;
      }

      // Calculate sprint statistics
      const sprintStats = statusUtils.calculateSprintStats(index, tasks, sprint);
      if (sprintStats) {
        result.sprint = sprintStats;
      }

      // Calculate period statistics for specified dates
      const periodStats = statusUtils.calculatePeriodStats(index, tasks, dates);
      if (periodStats) {
        result.period = periodStats;
      }
    }
    return result;
  }

  /**
   * Validate the index and task files
   * @param {boolean} [save=false] Re-save all files
   * @return {Promise<Array>} Empty array if everything validated, otherwise an array of parsing errors
   */
  async validate(save = false) {
    // Check if this folder has been initialised
    if (!(await this.initialised())) {
      throw new Error("Not initialised in this folder");
    }
    const errors = [];

    // Load & parse index
    let index = null;
    try {
      index = await this.loadIndex();

      // Re-save index if required
      if (save) {
        await this.saveIndex(index);
      }
    } catch (error) {
      // Add the index error to the errors array
      errors.push({
        task: null,
        errors: error.message.includes('Unable to parse index')
          ? error.message
          : `Unable to parse index: ${error.message}`
      });

      // Exit early if any errors were found in the index
      return errors;
    }

    // Load & parse tasks
    const trackedTasks = getTrackedTaskIds(index);
    for (let taskId of trackedTasks) {
      try {
        const task = await this.loadTask(taskId);

        // Re-save tasks if required
        if (save) {
          await this.saveTask(getTaskPath(await this.getTaskFolderPath(), taskId), task);
        }
      } catch (error) {
        errors.push({
          task: taskId,
          errors: error.message,
        });
      }
    }

    // Return a list of errors or empty array if there were no errors
    return errors;
  }

  /**
   * Sort a column in the index
   * @param {string} columnName The column name to sort
   * @param {object[]} sorters A list of objects containing the field to sort by, filters and sort order
   * @param {boolean} [save=false] True if the settings should be saved in index
   */
  async sort(columnName, sorters, save = false) {
    // Check if this folder has been initialised
    if (!(await this.initialised())) {
      throw new Error("Not initialised in this folder");
    }

    // Get index and make sure the column exists
    let index = await this.loadIndex();
    if (!(columnName in index.columns)) {
      throw new Error(`Column "${columnName}" doesn't exist`);
    }

    // Save the sorter settings if required (the column will be sorted when saving the index)
    if (save) {
      if (!("columnSorting" in index.options)) {
        index.options.columnSorting = {};
      }
      index.options.columnSorting[columnName] = sorters;

      // Otherwise, remove sorting settings for the specified column and manually sort the column
    } else {
      if ("columnSorting" in index.options && columnName in index.options.columnSorting) {
        delete index.options.columnSorting[columnName];
      }
      const tasks = await this.loadAllTrackedTasks(index, columnName);
      index = sortColumnInIndex(index, tasks, columnName, sorters);
    }
    await this.saveIndex(index);
  }

  /**
   * Start a sprint
   * @param {string} name Sprint name
   * @param {string} description Sprint description
   * @param {Date} start Sprint start date
   * @return {Promise<object>} The sprint object
   */
  async sprint(name, description, start) {
    // Check if this folder has been initialised
    if (!(await this.initialised())) {
      throw new Error("Not initialised in this folder");
    }

    // Get index and make sure it has a list of sprints in the options
    const index = await this.loadIndex();
    if (!("sprints" in index.options)) {
      index.options.sprints = [];
    }
    const sprintNumber = index.options.sprints.length + 1;
    const sprint = {
      start: start,
    };

    // If the name is blank, generate a default name
    if (!name) {
      sprint.name = `Sprint ${sprintNumber}`;
    } else {
      sprint.name = name;
    }

    // Add description if one exists
    if (description) {
      sprint.description = description;
    }

    // Add sprint and save the index
    index.options.sprints.push(sprint);
    await this.saveIndex(index);
    return sprint;
  }

  /**
   * Output burndown chart data
   * @param {?string[]} [sprints=null] The sprint names or numbers to show a chart for, or null for
   * the current sprint
   * @param {?Date[]} [dates=null] The dates to show a chart for, or null for no date filter
   * @param {?string} [assigned=null] The assigned user to filter for, or null for no assigned filter
   * @param {?string[]} [columns=null] The columns to filter for, or null for no column filter
   * @param {?string} [normalise=null] The date normalisation mode
   * @return {Promise<object>} Burndown chart data as an object
   */
  async burndown(sprints = null, dates = null, assigned = null, columns = null, normalise = null) {
    // Check if this folder has been initialised
    if (!(await this.initialised())) {
      throw new Error("Not initialised in this folder");
    }

    // Get index and tasks
    const index = await this.loadIndex();
    const tasks = [...(await this.loadAllTrackedTasks(index))]
      .map((task) => {
        const created = "created" in task.metadata ? task.metadata.created : new Date(0);
        return {
          ...task,
          created,
          started:
            "started" in task.metadata
              ? task.metadata.started
              : "startedColumns" in index.options && index.options.startedColumns.indexOf(task.column) !== -1
              ? created
              : false,
          completed:
            "completed" in task.metadata
              ? task.metadata.completed
              : "completedColumns" in index.options && index.options.completedColumns.indexOf(task.column) !== -1
              ? created
              : false,
          progress: taskProgress(index, task),
          assigned: "assigned" in task.metadata ? task.metadata.assigned : null,
          workload: taskWorkload(index, task),
          column: findTaskColumn(index, task.id),
        };
      })
      .filter(
        (task) =>
          (assigned === null || task.assigned === assigned) &&
          (columns === null || columns.indexOf(task.column) !== -1)
      );

    // Get sprints and dates to plot from arguments
    const series = [];
    const indexSprints = "sprints" in index.options && index.options.sprints.length ? index.options.sprints : null;
    if (sprints === null && dates === null) {
      if (indexSprints !== null) {
        // Show current sprint
        const currentSprint = indexSprints.length - 1;
        series.push({
          sprint: indexSprints[currentSprint],
          from: new Date(indexSprints[currentSprint].start),
          to: new Date(),
        });
      } else {
        // Show all time
        series.push({
          from: new Date(
            Math.min(
              ...tasks
                .map((t) =>
                  [
                    "created" in t.metadata && t.metadata.created,
                    "started" in t.metadata && t.metadata.started,
                    "completed" in t.metadata && (t.metadata.completed || new Date(8640000000000000))
                  ].filter((d) => d)
                )
                .flat()
            )
          ),
          to: new Date(),
        });
      }
    } else {
      // Show specified sprint
      if (sprints !== null) {
        if (indexSprints === null) {
          throw new Error(`No sprints defined`);
        } else {
          for (const sprint of sprints) {
            let sprintIndex = null;

            // Select sprint by number (1-based index)
            if (typeof sprint === "number") {
              if (sprint < 1 || sprint > indexSprints.length) {
                throw new Error(`Sprint ${sprint} does not exist`);
              } else {
                sprintIndex = sprint - 1;
              }

              // Or select sprint by name
            } else if (typeof sprint === "string") {
              sprintIndex = indexSprints.findIndex((s) => s.name === sprint);
              if (sprintIndex === -1) {
                throw new Error(`No sprint found with name "${sprint}"`);
              }
            }
            if (sprintIndex === null) {
              throw new Error(`Invalid sprint "${sprint}"`);
            }

            // Get sprint start and end
            series.push({
              sprint: indexSprints[sprintIndex],
              from: new Date(indexSprints[sprintIndex].start),
              to: sprintIndex < indexSprints.length - 1 ? new Date(indexSprints[sprintIndex + 1].start) : new Date(),
            });
          }
        }
      }

      // Show specified date range
      if (dates !== null) {
        series.push({
          from: new Date(Math.min(...dates)),
          to: dates.length === 1 ? new Date() : new Date(Math.max(...dates)),
        });
      }
    }

    // If normalise mode is 'auto', find the most appropriate normalisation mode
    if (normalise === 'auto') {
      const delta = series[0].to - series[0].from;
      if (delta >= DAY * 7) {
        normalise = 'days';
      } else if (delta >= DAY) {
        normalise = 'hours';
      } else if (delta >= HOUR ) {
        normalise = 'minutes';
      } else {
        normalise = 'seconds';
      }
    }
    if (normalise !== null) {

      // Normalize series from and to dates
      series.forEach((s) => {
        s.from = normaliseDate(s.from, normalise);
        s.to = normaliseDate(s.to, normalise);
      });

      // Normalise task dates
      tasks.forEach((task) => {
        if (task.created) {
          task.created = normaliseDate(task.created, normalise);
        }
        if (task.started) {
          task.started = normaliseDate(task.started, normalise);
        }
        if (task.completed) {
          task.completed = normaliseDate(task.completed, normalise);
        }
      });
    }

    // Get workload datapoints for each period
    series.forEach((s) => {
      s.dataPoints = [
        {
          x: s.from,
          y: getWorkloadAtDate(tasks, s.from),
          count: countActiveTasksAtDate(tasks, s.from),
          tasks: getTaskEventsAtDate(tasks, s.from),
        },
        ...tasks
          .filter((task) => {
            let result = false;
            if (task.created && task.created >= s.from && task.created <= s.to) {
              result = true;
            }
            if (task.started && task.started >= s.from && task.started <= s.to) {
              result = true;
            }
            if (task.completed && task.completed >= s.from && task.completed <= s.to) {
              result = true;
            }
            return result;
          })
          .map((task) => [
            task.created,
            task.started,
            task.completed
          ])
          .flat()
          .filter((d) => d)
          .map((x) => ({
            x,
            y: getWorkloadAtDate(tasks, x),
            count: countActiveTasksAtDate(tasks, x),
            tasks: getTaskEventsAtDate(tasks, x),
          })),
        {
          x: s.to,
          y: getWorkloadAtDate(tasks, s.to),
          count: countActiveTasksAtDate(tasks, s.to),
          tasks: getTaskEventsAtDate(tasks, s.to),
        },
      ].sort((a, b) => a.x.getTime() - b.x.getTime());
    });
    return { series };
  }

  /**
   * Add a comment to a task
   * @param {string} taskId The task id
   * @param {string} text The comment text
   * @param {string} author The comment author
   * @return {Promise<string>} The task id
   */
  async comment(taskId, text, author) {
    // Check if this folder has been initialised
    if (!(await this.initialised())) {
      throw new Error("Not initialised in this folder");
    }
    taskId = removeFileExtension(taskId);

    // Make sure the task file exists
    if (!(await fileUtils.exists(getTaskPath(await this.getTaskFolderPath(), taskId)))) {
      throw new Error(`No task file found with id "${taskId}"`);
    }

    // Get index and make sure the task is indexed
    let index = await this.loadIndex();
    if (!taskInIndex(index, taskId)) {
      throw new Error(`Task "${taskId}" is not in the index`);
    }

    // Make sure the comment text isn't empty
    if (!text) {
      throw new Error("Comment text cannot be empty");
    }

    // Add the comment
    const taskData = await this.loadTask(taskId);
    const taskPath = getTaskPath(await this.getTaskFolderPath(), taskId);
    taskData.comments.push({
      text,
      author,
      date: new Date(),
    });

    // Save the task
    await this.saveTask(taskPath, taskData);
    return taskId;
  }

  /**
   * Return a list of archived tasks
   * @return {Promise<string[]>} A list of archived task ids
   */
  async listArchivedTasks() {
    // Check if this folder has been initialised
    if (!(await this.initialised())) {
      throw new Error("Not initialised in this folder");
    }

    // Make sure the archive folder exists
    const archiveFolder = await this.getArchiveFolderPath();
    if (!(await fileUtils.exists(archiveFolder))) {
      throw new Error("Archive folder doesn't exist");
    }

    // Get a list of archived task files
    const files = await glob(`${archiveFolder}/*.md`);
    return [...new Set(files.map((task) => path.parse(task).name))];
  }

  /**
   * Move a task to the archive
   * @param {string} taskId The task id
   * @return {Promise<string>} The task id
   */
  async archiveTask(taskId) {
    // Check if this folder has been initialised
    if (!(await this.initialised())) {
      throw new Error("Not initialised in this folder");
    }
    taskId = removeFileExtension(taskId);

    // Make sure the task file exists
    if (!(await fileUtils.exists(getTaskPath(await this.getTaskFolderPath(), taskId)))) {
      throw new Error(`No task file found with id "${taskId}"`);
    }

    // Make sure there isn't already an archived task with the same id
    const archiveFolder = await this.getArchiveFolderPath();
    const archivedTaskPath = getTaskPath(archiveFolder, taskId);
    if (await fileUtils.exists(archivedTaskPath)) {
      throw new Error(`An archived task with id "${taskId}" already exists`);
    }

    // Get index and make sure the task is indexed
    let index = await this.loadIndex();
    if (!taskInIndex(index, taskId)) {
      throw new Error(`Task "${taskId}" is not in the index`);
    }

    // Create archive folder if it doesn't already exist
    if (!(await fileUtils.exists(archiveFolder))) {
      await fs.promises.mkdir(archiveFolder, { recursive: true });
    }

    // Save the column name in the task's metadata
    let taskData = await this.loadTask(taskId);
    taskData = setTaskMetadata(taskData, "column", findTaskColumn(index, taskId));

    // Save the task inside the archive folder
    await this.saveTask(archivedTaskPath, taskData);

    // Remove the original task
    await this.deleteTask(taskId, true);

    return taskId;
  }

  /**
   * Restore a task from the archive
   * @param {string} taskId The task id
   * @param {?string} [columnName=null] The column to restore the task to
   * @return {Promise<string>} The task id
   */
  async restoreTask(taskId, columnName = null) {
    // Check if this folder has been initialised
    if (!(await this.initialised())) {
      throw new Error("Not initialised in this folder");
    }
    taskId = removeFileExtension(taskId);

    const archiveFolder = await this.getArchiveFolderPath();
    const archivedTaskPath = getTaskPath(archiveFolder, taskId);
    const taskPath = getTaskPath(await this.getTaskFolderPath(), taskId);

    // Make sure the archive folder exists
    if (!(await fileUtils.exists(archiveFolder))) {
      throw new Error("Archive folder doesn't exist");
    }

    // Make sure the task file exists in the archive
    if (!(await fileUtils.exists(archivedTaskPath))) {
      throw new Error(`No archived task found with id "${taskId}"`);
    }

    // Get index and make sure there isn't already an indexed task with the same id
    let index = await this.loadIndex();
    if (taskInIndex(index, taskId)) {
      throw new Error(`There is already an indexed task with id "${taskId}"`);
    }

    // Check if there is already a task with the same id
    if (await fileUtils.exists(taskPath)) {
      throw new Error(`There is already an untracked task with id "${taskId}"`);
    }

    // Make sure the index has some columns
    const columns = Object.keys(index.columns);
    if (columns.length === 0) {
      throw new Error('No columns defined in the index');
    }

    // Load the task from the archive
    let taskData = await this.loadArchivedTask(taskId);
    let actualColumnName = columnName || getTaskMetadata(taskData, "column") || columns[0];
    taskData = setTaskMetadata(taskData, "column", undefined);

    // Update task metadata dates and save task
    taskData = updateColumnLinkedCustomFields(index, taskData, actualColumnName);
    await this.saveTask(taskPath, taskData);

    // Add the task to the column and save the index
    index = addTaskToIndex(index, taskId, actualColumnName);
    await this.saveIndex(index);

    // Delete the archived task file
    await fs.promises.unlink(archivedTaskPath);

    return taskId;
  }

  /**
   * Nuke it from orbit, it's the only way to be sure
   */
  async removeAll() {
    // Check if this folder has been initialised
    if (!(await this.initialised())) {
      throw new Error("Not initialised in this folder");
    }
    rimraf.sync(await this.getMainFolder());
  }
};

/**
 * Factory function that creates and returns a new Kanbn instance
 * @returns {Kanbn} A new Kanbn instance
 */
function createKanbn() {
  return new Kanbn();
}

module.exports = createKanbn;

// Add utility functions and the Kanbn class as properties
module.exports.Kanbn = Kanbn;
module.exports.findTaskColumn = findTaskColumn;
module.exports.getTaskPath = getTaskPath;
module.exports.addFileExtension = addFileExtension;
module.exports.removeFileExtension = removeFileExtension;
module.exports.taskInIndex = taskInIndex;
module.exports.addTaskToIndex = addTaskToIndex;
module.exports.removeTaskFromIndex = removeTaskFromIndex;
module.exports.renameTaskInIndex = renameTaskInIndex;
module.exports.getTaskMetadata = getTaskMetadata;
module.exports.setTaskMetadata = setTaskMetadata;
module.exports.taskCompleted = taskCompleted;
