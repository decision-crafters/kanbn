const fs = require('fs');
const path = require('path');
const utility = require('../utility');
const fileUtils = require('./file-utils');
const taskUtils = require('./task-utils');
const filterUtils = require('./filter-utils');
const KanbnError = require('../errors/KanbnError');

/**
 * Get a list of all tracked task ids
 * @param {object} index The index object
 * @param {?string} [columnName=null] The optional column name to filter tasks by
 * @return {Set} A set of task ids appearing in the index
 */
function getTrackedTaskIds(index, columnName = null) {
  if (!index || !index.columns) {
    return new Set();
  }

  return new Set(
    columnName
      ? (index.columns[columnName] || [])
      : Object.keys(index.columns)
          .map((columnName) => index.columns[columnName])
          .flat()
  );
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
  tasks = tasks.map((task) => ({
    ...task,
    ...task.metadata,
    created: "created" in task.metadata ? task.metadata.created : "",
    updated: "updated" in task.metadata ? task.metadata.updated : "",
    started: "started" in task.metadata ? task.metadata.started : "",
    completed: "completed" in task.metadata ? task.metadata.completed : "",
    due: "due" in task.metadata ? task.metadata.due : "",
    assigned: "assigned" in task.metadata ? task.metadata.assigned : "",
    countSubTasks: task.subTasks.length,
    subTasks: task.subTasks.map((subTask) => `[${subTask.completed ? "x" : ""}] ${subTask.text}`).join("\n"),
    countTags: "tags" in task.metadata ? task.metadata.tags.length : 0,
    tags: "tags" in task.metadata ? task.metadata.tags.join("\n") : "",
    countRelations: task.relations.length,
    relations: task.relations.map((relation) => `${relation.type} ${relation.task}`).join("\n"),
    countComments: task.comments.length,
    comments: task.comments.map((comment) => `${comment.author} ${comment.text}`).join("\n"),
    workload: taskWorkload(index, task),
    progress: taskProgress(index, task),
  }));

  tasks = sortTasks(tasks, sorters);

  index.columns[columnName] = tasks.map((task) => task.id);
  return index;
}

/**
 * Sort a list of tasks
 * @param {object[]} tasks
 * @param {object[]} sorters
 * @return {object[]} The sorted tasks
 */
function sortTasks(tasks, sorters) {
  tasks.sort((a, b) => {
    let compareA, compareB;
    for (let sorter of sorters) {
      compareA = a[sorter.field];
      compareB = b[sorter.field];
      if (sorter.filter) {
        compareA = sortFilter(compareA, sorter.filter);
        compareB = sortFilter(compareB, sorter.filter);
      }
      if (compareA === compareB) {
        continue;
      }
      return sorter.order === "descending" ? compareValues(compareB, compareA) : compareValues(compareA, compareB);
    }
    return 0;
  });
  return tasks;
}

/**
 * Transform a value using a sort filter regular expression
 * @param {string} value
 * @param {string} filter
 * @return {string} The transformed value
 */
function sortFilter(value, filter) {
  const matches = [...value.matchAll(new RegExp(filter, "gi"))];
  const result = matches.map((match) => {
    if (match.groups) {
      return Object.values(match.groups).join("");
    }

    if (match[1]) {
      return match[1];
    }

    return match[0];
  });
  return result.join("");
}

/**
 * Compare two values (supports string, date and number values)
 * @param {any} a
 * @param {any} b
 * @return {number} A positive value if a > b, negative if a < b, otherwise 0
 */
function compareValues(a, b) {
  if (a === undefined && b === undefined) {
    return 0;
  }
  a = utility.coerceUndefined(a, typeof b);
  b = utility.coerceUndefined(b, typeof a);
  if (typeof a === "string" && typeof b === "string") {
    return a.localeCompare(b, undefined, { sensitivity: "accent" });
  }
  return a - b;
}

/**
 * Filter a list of tasks using a filters object containing field names and filter values
 * @param {object} index
 * @param {object|object[]} tasks - Can be an array of task objects or an object with task IDs as keys
 * @param {object} filters
 * @return {object[]} Array of filtered tasks
 */
function filterTasks(index, tasks, filters) {
  // Convert tasks to array if it's an object
  const taskArray = Array.isArray(tasks) ? tasks : Object.entries(tasks).map(([id, task]) => {
    // Ensure task has its ID property set
    return { ...task, id: task.id || id };
  });
  
  return taskArray.filter((task) => {
    // Get task ID, either from task.id or from task.name
    const taskId = task.id || utility.getTaskId(task.name);
    const column = taskUtils.findTaskColumn(index, taskId);

    if (Object.keys(filters).length === 0) {
      return true;
    }

    let result = true;

    if ("id" in filters && !filterUtils.stringFilter(filters.id, taskId)) {
      result = false;
    }

    if ("name" in filters && !filterUtils.stringFilter(filters.name, task.name)) {
      result = false;
    }

    if ("description" in filters && !filterUtils.stringFilter(filters.description, task.description)) {
      result = false;
    }

    if ("column" in filters && !filterUtils.stringFilter(filters.column, column)) {
      result = false;
    }

    if (
      "created" in filters &&
      (!("created" in task.metadata) || !filterUtils.dateFilter(filters.created, task.metadata.created))
    ) {
      result = false;
    }

    if (
      "updated" in filters &&
      (!("updated" in task.metadata) || !filterUtils.dateFilter(filters.updated, task.metadata.updated))
    ) {
      result = false;
    }

    if (
      "started" in filters &&
      (!("started" in task.metadata) || !filterUtils.dateFilter(filters.started, task.metadata.started))
    ) {
      result = false;
    }

    if (
      "completed" in filters &&
      (!("completed" in task.metadata) || !filterUtils.dateFilter(filters.completed, task.metadata.completed))
    ) {
      result = false;
    }

    if ("due" in filters && (!("due" in task.metadata) || !filterUtils.dateFilter(filters.due, task.metadata.due))) {
      result = false;
    }

    if ("workload" in filters && !filterUtils.numberFilter(filters.workload, taskWorkload(index, task))) {
      result = false;
    }

    if ("progress" in filters && !filterUtils.numberFilter(filters.progress, taskProgress(index, task))) {
      result = false;
    }

    if (
      "assigned" in filters &&
      !filterUtils.stringFilter(filters.assigned, "assigned" in task.metadata ? task.metadata.assigned : "")
    ) {
      result = false;
    }

    if (
      "sub-task" in filters &&
      !filterUtils.stringFilter(
        filters["sub-task"],
        task.subTasks.map((subTask) => `[${subTask.completed ? "x" : " "}] ${subTask.text}`).join("\n")
      )
    ) {
      result = false;
    }

    if ("count-sub-tasks" in filters && !filterUtils.numberFilter(filters["count-sub-tasks"], task.subTasks.length)) {
      result = false;
    }

    if ("tag" in filters) {
      const tags = task.metadata && task.metadata.tags ? task.metadata.tags.join("\n") : "";
      if (!filterUtils.stringFilter(filters.tag, tags)) {
        result = false;
      }
    }

    if ("count-tags" in filters) {
      const tagsLength = task.metadata && task.metadata.tags ? task.metadata.tags.length : 0;
      if (!filterUtils.numberFilter(filters["count-tags"], tagsLength)) {
        result = false;
      }
    }

    if (
      "relation" in filters &&
      !filterUtils.stringFilter(
        filters.relation,
        task.relations.map((relation) => `${relation.type} ${relation.task}`).join("\n")
      )
    ) {
      result = false;
    }

    if ("count-relations" in filters && !filterUtils.numberFilter(filters["count-relations"], task.relations.length)) {
      result = false;
    }

    if (
      "comment" in filters &&
      !filterUtils.stringFilter(filters.comment, task.comments.map((comment) => `${comment.author} ${comment.text}`).join("\n"))
    ) {
      result = false;
    }

    if ("count-comments" in filters && !filterUtils.numberFilter(filters["count-comments"], task.comments.length)) {
      result = false;
    }

    if ("customFields" in index.options) {
      for (let customField of index.options.customFields) {
        if (customField.name in filters) {
          if (!(customField.name in task.metadata)) {
            result = false;
          } else {
            switch (customField.type) {
              case "boolean":
                if (task.metadata[customField.name] !== filters[customField.name]) {
                  result = false;
                }
                break;
              case "number":
                if (!filterUtils.numberFilter(filters[customField.name], task.metadata[customField.name])) {
                  result = false;
                }
                break;
              case "string":
                if (!filterUtils.stringFilter(filters[customField.name], task.metadata[customField.name])) {
                  result = false;
                }
                break;
              case "date":
                if (!filterUtils.dateFilter(filters[customField.name], task.metadata[customField.name])) {
                  result = false;
                }
                break;
              default:
                break;
            }
          }
        }
      }
    }
    return result;
  });
}

/**
 * Calculate task workload
 * @param {object} index The index object
 * @param {object} task The task object
 * @return {number} The task workload
 */
function taskWorkload(index, task) {
  const DEFAULT_TASK_WORKLOAD = 2;
  const DEFAULT_TASK_WORKLOAD_TAGS = {
    Nothing: 0,
    Tiny: 1,
    Small: 2,
    Medium: 3,
    Large: 5,
    Huge: 8,
  };

  const defaultTaskWorkload =
    "defaultTaskWorkload" in index.options ? index.options.defaultTaskWorkload : DEFAULT_TASK_WORKLOAD;
  const taskWorkloadTags =
    "taskWorkloadTags" in index.options ? index.options.taskWorkloadTags : DEFAULT_TASK_WORKLOAD_TAGS;
  let workload = 0;
  let hasWorkloadTags = false;
  if ("tags" in task.metadata) {
    for (let workloadTag of Object.keys(taskWorkloadTags)) {
      if (task.metadata.tags.indexOf(workloadTag) !== -1) {
        workload += taskWorkloadTags[workloadTag];
        hasWorkloadTags = true;
      }
    }
  }
  if (!hasWorkloadTags) {
    workload = defaultTaskWorkload;
  }
  return workload;
}

/**
 * Get task progress amount
 * @param {object} index
 * @param {object} task
 * @return {number} Task progress
 */
function taskProgress(index, task) {
  if (taskUtils.taskCompleted(index, task)) {
    return 1;
  }
  return "progress" in task.metadata ? task.metadata.progress : 0;
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
  const filteredTasks = tasks.filter(
    (task) =>
      metadataProperty in task.metadata &&
      task.metadata[metadataProperty] >= start &&
      task.metadata[metadataProperty] <= end
  );
  return {
    tasks: filteredTasks.map((task) => ({
      id: task.id,
      column: task.column,
      workload: task.workload,
    })),
    workload: filteredTasks.reduce((a, task) => a + task.workload, 0),
  };
}

/**
 * Get a list of tasks that were started before and/or completed after a date
 * @param {object[]} tasks
 * @param {Date} date
 * @return {object[]} A filtered list of tasks
 */
function getActiveTasksAtDate(tasks, date) {
  return tasks.filter((task) => (
    (task.started !== false && task.started <= date) &&
    (task.completed === false || task.completed > date)
  ));
}

/**
 * Calculate the total workload at a specific date
 * @param {object[]} tasks
 * @param {Date} date
 * @return {number} The total workload at the specified date
 */
function getWorkloadAtDate(tasks, date) {
  return getActiveTasksAtDate(tasks, date).reduce((a, task) => (a += task.workload), 0);
}

/**
 * Get the number of tasks that were active at a specific date
 * @param {object[]} tasks
 * @param {Date} date
 * @return {number} The total number of active tasks at the specified date
 */
function countActiveTasksAtDate(tasks, date) {
  return getActiveTasksAtDate(tasks, date).length;
}

/**
 * Get a list of tasks that were started or completed on a specific date
 * @param {object[]} tasks
 * @param {Date} date
 * @return {object[]} A list of event objects, with event type and task id
 */
function getTaskEventsAtDate(tasks, date) {
  return [
    ...tasks
      .filter((task) => (task.created ? task.created.getTime() : 0) === date.getTime())
      .map((task) => ({
        eventType: "created",
        task
      })),
    ...tasks
      .filter((task) => (task.started ? task.started.getTime() : 0) === date.getTime())
      .map((task) => ({
        eventType: "started",
        task
      })),
    ...tasks
      .filter((task) => (task.completed ? task.completed.getTime() : 0) === date.getTime())
      .map((task) => ({
        eventType: "completed",
        task
      })),
  ];
}

/**
 * Quantize a burndown chart date to 1-hour resolution
 * @param {Date} date
 * @param {string} resolution One of 'days', 'hours', 'minutes', 'seconds'
 * @return {Date} The quantized dates
 */
function normaliseDate(date, resolution = 'minutes') {
  const result = new Date(date.getTime());
  switch (resolution) {
    case 'days':
      result.setHours(0);
    case 'hours':
      result.setMinutes(0);
    case 'minutes':
      result.setSeconds(0);
    case 'seconds':
      result.setMilliseconds(0);
    default:
      break;
  }
  return result;
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
  taskData = updateColumnLinkedCustomField(index, taskData, columnName, "completed", "once");
  taskData = updateColumnLinkedCustomField(index, taskData, columnName, "started", "once");

  if ("customFields" in index.options) {
    for (let customField of index.options.customFields) {
      if (customField.type === "date") {
        taskData = updateColumnLinkedCustomField(
          index,
          taskData,
          columnName,
          customField.name,
          customField.updateDate || "none"
        );
      }
    }
  }
  return taskData;
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
  const columnList = `${fieldName}Columns`;
  if (columnList in index.options && index.options[columnList].indexOf(columnName) !== -1) {
    switch (updateCriteria) {
      case "always":
        taskData = taskUtils.setTaskMetadata(taskData, fieldName, new Date());
        break;
      case "once":
        if (!(fieldName in taskData.metadata && taskData.metadata[fieldName])) {
          taskData = taskUtils.setTaskMetadata(taskData, fieldName, new Date());
        }
        break;
      default:
        break;
    }
  }
  return taskData;
}

/**
 * Save index data to the index file
 * @param {object} indexData Index data to save
 * @param {Function} loadAllTrackedTasks Function to load all tracked tasks
 * @param {Function} configExists Function to check if config exists
 * @param {Function} saveConfig Function to save config
 * @param {Function} getIndexPath Function to get index path
 * @param {boolean} ignoreOptions Whether to ignore options when saving
 * @return {Promise<void>}
 */
async function saveIndex(indexData, loadAllTrackedTasks, configExists, saveConfig, getIndexPath, ignoreOptions = false) {
  const parseIndex = require('../parse-index');
  const fs = require('fs');

  try {
    // Validate indexData is not null or undefined
    if (!indexData) {
      throw new KanbnError('indexData is null or undefined');
    }
    
    // Validate columnSorting configuration before processing
    if (indexData && indexData.options && "columnSorting" in indexData.options) {
      const columnSorting = indexData.options.columnSorting;
      
      // Check if columnSorting is valid
      if (!columnSorting || typeof columnSorting !== 'object') {
        console.warn('Invalid columnSorting configuration: not an object');
      } else if (Object.keys(columnSorting).length > 0) {
        // Validate that indexData has columns structure
        if (!indexData.columns || typeof indexData.columns !== 'object') {
          console.warn('Cannot process columnSorting: index missing columns structure');
        } else {
          for (let columnName in columnSorting) {
            try {
              // Validate column exists in index
              if (!(columnName in indexData.columns)) {
                console.warn(`Skipping sort for non-existent column: ${columnName}`);
                continue;
              }
              
              // Validate sorting configuration for this column
              const sortingOptions = columnSorting[columnName];
              if (!Array.isArray(sortingOptions)) {
                console.warn(`Invalid sorting options for column ${columnName}: expected array`);
                continue;
              }
              
              const tasks = await loadAllTrackedTasks(indexData, columnName);
              indexData = sortColumnInIndex(
                indexData,
                tasks,
                columnName,
                sortingOptions
              );
            } catch (error) {
              console.error(`Error sorting column ${columnName}: ${error.message}`);
              // Continue with next column
            }
          }
        }
      }
    }

    if (!ignoreOptions && await configExists()) {
      await saveConfig(indexData.options);
      ignoreOptions = true;
    }

    await fs.promises.writeFile(await getIndexPath(), parseIndex.json2md(indexData, ignoreOptions));
  } catch (error) {
    console.error(`Error saving index: ${error.message}`);
    throw error; // Re-throw to maintain existing error handling behavior
  }
}

/**
 * Load the index file and parse it to an object
 * @param {Function} getIndexPath Function to get index path
 * @param {Function} getConfig Function to get config
 * @return {Promise<object>} The index object
 */
async function loadIndex(getIndexPath, getConfig) {
  const parseIndex = require('../parse-index');
  const fs = require('fs');

  let indexData = "";
  try {
    indexData = await fs.promises.readFile(await getIndexPath(), { encoding: "utf-8" });
  } catch (error) {
    throw new KanbnError(`Couldn't access index file: ${error.message}`);
  }

  try {
    const index = parseIndex.md2json(indexData);

    const config = await getConfig();
    if (config !== null) {
      index.options = { ...index.options, ...config };
    }
    return index;
  } catch (error) {
    throw new KanbnError(`Unable to parse index: ${error.message}`);
  }
}

/**
 * Add an untracked task to the index
 * @param {object} index The index object
 * @param {string} taskId The task ID to add
 * @param {string} columnName The column to add the task to
 * @param {Function} initialised Function to check if kanbn is initialised
 * @param {Function} getTaskFolderPath Function to get task folder path
 * @param {Function} loadTask Function to load a task
 * @param {Function} saveTask Function to save a task
 * @param {Function} saveIndex Function to save the index
 * @return {Promise<string>} The task ID
 */
async function addUntrackedTaskToIndex(
  index,
  taskId,
  columnName,
  initialised,
  getTaskFolderPath,
  loadTask,
  saveTask,
  saveIndex
) {
  const fs = require('fs');

  if (!(await initialised())) {
    throw new KanbnError("Not initialised in this folder");
  }
  taskId = fileUtils.removeFileExtension(taskId);

  if (!(await fileUtils.exists(fileUtils.getTaskPath(await getTaskFolderPath(), taskId)))) {
    throw new KanbnError(`No task file found with id "${taskId}"`);
  }

  if (!(columnName in index.columns)) {
    throw new KanbnError(`Column "${columnName}" doesn't exist`);
  }

  if (taskUtils.taskInIndex(index, taskId)) {
    throw new KanbnError(`Task "${taskId}" is already in the index`);
  }

  // Load task data
  let taskData = await loadTask(taskId);
  const taskPath = fileUtils.getTaskPath(await getTaskFolderPath(), taskId);

  taskData = updateColumnLinkedCustomFields(index, taskData, columnName);
  await saveTask(taskPath, taskData);

  // Add the task to the column and save the index
  index = taskUtils.addTaskToIndex(index, taskId, columnName);
  await saveIndex(index);
  return taskId;
}

/**
 * Find all tracked tasks in the index
 * @param {object} index The index object
 * @param {Function} initialised Function to check if kanbn is initialised
 * @param {string} columnName Optional column name to filter by
 * @return {Promise<Set>} A set of tracked task IDs
 */
async function findTrackedTasks(index, initialised, columnName = null) {
  // Check if this folder has been initialised
  if (!(await initialised())) {
    throw new KanbnError("Not initialised in this folder");
  }

  return getTrackedTaskIds(index, columnName);
}

/**
 * Find all untracked tasks (markdown files in tasks folder not in the index)
 * @param {object} index The index object
 * @param {Function} initialised Function to check if kanbn is initialised
 * @param {Function} getTaskFolderPath Function to get task folder path
 * @return {Promise<Set>} A set of untracked task IDs
 */
async function findUntrackedTasks(index, initialised, getTaskFolderPath) {
  const fs = require('fs');
  const path = require('path');

  // Check if this folder has been initialised
  if (!(await initialised())) {
    throw new KanbnError("Not initialised in this folder");
  }

  const trackedTasks = getTrackedTaskIds(index);

  try {
    // Use fs.readdir instead of glob to avoid dependency issues
    const taskFolderPath = await getTaskFolderPath();
    const files = await fs.promises.readdir(taskFolderPath, { withFileTypes: true });

    // Filter for markdown files only
    const mdFiles = files
      .filter(file => file.isFile() && file.name.endsWith('.md'))
      .map(file => path.join(taskFolderPath, file.name));

    const untrackedTasks = new Set(mdFiles.map((task) => path.parse(task).name));
    return new Set([...untrackedTasks].filter((x) => !trackedTasks.has(x)));
  } catch (error) {
    console.error(`Error finding untracked tasks: ${error.message}`);
    return new Set(); // Return empty set on error
  }
}

/**
 * Update a task with new data
 * @param {object} index The index object
 * @param {string} taskId The task ID to update
 * @param {object} taskData The new task data
 * @param {string|null} columnName Optional column to move the task to
 * @param {Function} initialised Function to check if kanbn is initialised
 * @param {Function} getTaskFolderPath Function to get task folder path
 * @param {Function} loadTask Function to load a task
 * @param {Function} saveTask Function to save a task
 * @param {Function} renameTask Function to rename a task
 * @param {Function} moveTask Function to move a task
 * @param {Function} saveIndex Function to save the index
 * @return {Promise<string>} The task ID (may be updated if renamed)
 */
async function updateTask(
  index,
  taskId,
  taskData,
  columnName,
  initialised,
  getTaskFolderPath,
  loadTask,
  saveTask,
  renameTask,
  moveTask,
  saveIndex
) {
  const fileUtils = require('./file-utils');
  const taskUtils = require('./task-utils');

  // Check if this folder has been initialised
  if (!(await initialised())) {
    throw new KanbnError("Not initialised in this folder");
  }
  taskId = fileUtils.removeFileExtension(taskId);

  if (!(await fileUtils.exists(fileUtils.getTaskPath(await getTaskFolderPath(), taskId)))) {
    throw new KanbnError(`No task file found with id "${taskId}"`);
  }

  if (!taskUtils.taskInIndex(index, taskId)) {
    throw new KanbnError(`Task "${taskId}" is not in the index`);
  }

  if (!taskData.name) {
    throw new KanbnError("Task name cannot be blank");
  }

  const originalTaskData = await loadTask(taskId);
  if (originalTaskData.name !== taskData.name) {
    taskId = await renameTask(taskId, taskData.name);

    index = await loadTask(taskId);
  }

  if (columnName && !(columnName in index.columns)) {
    throw new KanbnError(`Column "${columnName}" doesn't exist`);
  }

  taskData = taskUtils.setTaskMetadata(taskData, "updated", new Date());

  await saveTask(fileUtils.getTaskPath(await getTaskFolderPath(), taskId), taskData);

  if (columnName) {
    await moveTask(taskId, columnName);
  } else {
    // Otherwise save the index
    await saveIndex(index);
  }

  return taskId;
}

/**
 * Rename a task
 * @param {object} index The index object
 * @param {string} taskId The task ID to rename
 * @param {string} newTaskName The new task name
 * @param {Function} initialised Function to check if kanbn is initialised
 * @param {Function} getTaskFolderPath Function to get task folder path
 * @param {Function} loadTask Function to load a task
 * @param {Function} saveTask Function to save a task
 * @param {Function} saveIndex Function to save the index
 * @return {Promise<string>} The new task ID
 */
async function renameTask(
  index,
  taskId,
  newTaskName,
  initialised,
  getTaskFolderPath,
  loadTask,
  saveTask,
  saveIndex
) {
  const fs = require('fs');
  const utility = require('../utility');
  const fileUtils = require('./file-utils');
  const taskUtils = require('./task-utils');

  // Check if this folder has been initialised
  if (!(await initialised())) {
    throw new KanbnError("Not initialised in this folder");
  }
  taskId = fileUtils.removeFileExtension(taskId);

  if (!(await fileUtils.exists(fileUtils.getTaskPath(await getTaskFolderPath(), taskId)))) {
    throw new KanbnError(`No task file found with id "${taskId}"`);
  }

  if (!taskUtils.taskInIndex(index, taskId)) {
    throw new KanbnError(`Task "${taskId}" is not in the index`);
  }

  const newTaskId = utility.getTaskId(newTaskName);
  const newTaskPath = fileUtils.getTaskPath(await getTaskFolderPath(), newTaskId);
  if (await fileUtils.exists(newTaskPath)) {
    throw new KanbnError(`A task with id "${newTaskId}" already exists`);
  }

  if (taskUtils.taskInIndex(index, newTaskId)) {
    throw new KanbnError(`A task with id "${newTaskId}" is already in the index`);
  }

  let taskData = await loadTask(taskId);
  taskData.name = newTaskName;
  taskData = taskUtils.setTaskMetadata(taskData, "updated", new Date());
  await saveTask(fileUtils.getTaskPath(await getTaskFolderPath(), taskId), taskData);

  await fs.promises.rename(
    fileUtils.getTaskPath(await getTaskFolderPath(), taskId),
    newTaskPath
  );

  // Update the task id in the index
  index = taskUtils.renameTaskInIndex(index, taskId, newTaskId);
  await saveIndex(index);
  return newTaskId;
}

/**
 * Move a task from one column to another
 * @param {object} index The index object
 * @param {string} taskId The task ID to move
 * @param {string} columnName The column to move the task to
 * @param {number|null} position The position to move the task to (null for end of column)
 * @param {boolean} relative Whether the position is relative to the current position
 * @param {Function} initialised Function to check if kanbn is initialised
 * @param {Function} getTaskFolderPath Function to get task folder path
 * @param {Function} loadTask Function to load a task
 * @param {Function} saveTask Function to save a task
 * @param {Function} saveIndex Function to save the index
 * @return {Promise<string>} The task ID
 */
async function moveTask(
  index,
  taskId,
  columnName,
  position = null,
  relative = false,
  initialised,
  getTaskFolderPath,
  loadTask,
  saveTask,
  saveIndex
) {
  const fileUtils = require('./file-utils');
  const taskUtils = require('./task-utils');

  // Check if this folder has been initialised
  if (!(await initialised())) {
    throw new KanbnError("Not initialised in this folder");
  }
  taskId = fileUtils.removeFileExtension(taskId);

  if (!(await fileUtils.exists(fileUtils.getTaskPath(await getTaskFolderPath(), taskId)))) {
    throw new KanbnError(`No task file found with id "${taskId}"`);
  }

  if (!taskUtils.taskInIndex(index, taskId)) {
    throw new KanbnError(`Task "${taskId}" is not in the index`);
  }

  if (!(columnName in index.columns)) {
    throw new KanbnError(`Column "${columnName}" doesn't exist`);
  }

  // Update the task's updated date
  let taskData = await loadTask(taskId);
  taskData = taskUtils.setTaskMetadata(taskData, "updated", new Date());

  // Update task metadata dates
  taskData = updateColumnLinkedCustomFields(index, taskData, columnName);
  await saveTask(fileUtils.getTaskPath(await getTaskFolderPath(), taskId), taskData);

  const currentColumnName = taskUtils.findTaskColumn(index, taskId);
  const currentPosition = index.columns[currentColumnName].indexOf(taskId);

  if (position !== null) {
    if (relative) {
      const startPosition = (columnName === currentColumnName) ? currentPosition : 0;
      position = startPosition + position;
    }
    position = Math.max(Math.min(position, index.columns[columnName].length), 0);
  }

  index = taskUtils.removeTaskFromIndex(index, taskId);
  index = taskUtils.addTaskToIndex(index, taskId, columnName, position);
  await saveIndex(index);
  return taskId;
}

/**
 * Delete a task from the index
 * @param {object} index The index object
 * @param {string} taskId The task ID to delete
 * @param {boolean} removeFile Whether to remove the task file
 * @param {Function} initialised Function to check if kanbn is initialised
 * @param {Function} getTaskFolderPath Function to get task folder path
 * @param {Function} saveIndex Function to save the index
 * @return {Promise<string>} The task ID
 */
async function deleteTask(
  index,
  taskId,
  removeFile = false,
  initialised,
  getTaskFolderPath,
  saveIndex
) {
  const fs = require('fs');
  const fileUtils = require('./file-utils');
  const taskUtils = require('./task-utils');

  // Check if this folder has been initialised
  if (!(await initialised())) {
    throw new KanbnError("Not initialised in this folder");
  }
  taskId = fileUtils.removeFileExtension(taskId);

  if (!taskUtils.taskInIndex(index, taskId)) {
    throw new KanbnError(`Task "${taskId}" is not in the index`);
  }

  index = taskUtils.removeTaskFromIndex(index, taskId);

  if (removeFile && (await fileUtils.exists(fileUtils.getTaskPath(await getTaskFolderPath(), taskId)))) {
    await fs.promises.unlink(fileUtils.getTaskPath(await getTaskFolderPath(), taskId));
  }

  await saveIndex(index);
  return taskId;
}

/**
 * Search for tasks matching the given filters
 * @param {object} index The index object
 * @param {object} filters Filters to apply
 * @param {boolean} quiet Whether to return only task IDs
 * @param {Function} initialised Function to check if kanbn is initialised
 * @param {Function} loadAllTrackedTasks Function to load all tracked tasks
 * @param {Function} hydrateTask Function to hydrate a task
 * @return {Promise<Array>} Array of tasks or task IDs
 */
async function search(
  index,
  filters = {},
  quiet = false,
  initialised,
  loadAllTrackedTasks,
  hydrateTask
) {
  const utility = require('../utility');

  // Check if this folder has been initialised
  if (!(await initialised())) {
    throw new KanbnError("Not initialised in this folder");
  }

  let tasks = filterTasks(index, await loadAllTrackedTasks(index), filters);

  return tasks.map((task) => {
    return quiet ? utility.getTaskId(task.name) : hydrateTask(index, task);
  });
}

module.exports = {
  getTrackedTaskIds,
  sortColumnInIndex,
  sortTasks,
  sortFilter,
  compareValues,
  filterTasks,
  taskWorkload,
  taskProgress,
  taskWorkloadInPeriod,
  getActiveTasksAtDate,
  getWorkloadAtDate,
  countActiveTasksAtDate,
  getTaskEventsAtDate,
  normaliseDate,
  updateColumnLinkedCustomFields,
  updateColumnLinkedCustomField,
  saveIndex,
  loadIndex,
  addUntrackedTaskToIndex,
  findTrackedTasks,
  findUntrackedTasks,
  updateTask,
  renameTask,
  moveTask,
  deleteTask,
  search
};
