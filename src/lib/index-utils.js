const fs = require('fs');
const path = require('path');
const utility = require('../utility');
const fileUtils = require('./file-utils');
const taskUtils = require('./task-utils');
const filterUtils = require('./filter-utils');

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
 * @param {object[]}} tasks
 * @param {object} filters
 */
function filterTasks(index, tasks, filters) {
  return tasks.filter((task) => {
    const taskId = utility.getTaskId(task.name);
    const column = taskUtils.findTaskColumn(index, taskId);

    if (Object.keys(filters).length === 0) {
      return true;
    }

    let result = true;

    if ("id" in filters && !filterUtils.stringFilter(filters.id, task.id)) {
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

    if ("tag" in filters && !filterUtils.stringFilter(filters.tag, task.metadata.tags.join("\n"))) {
      result = false;
    }

    if ("count-tags" in filters && !filterUtils.numberFilter(filters["count-tags"], task.tags.length)) {
      result = false;
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
  
  if ("columnSorting" in indexData.options && Object.keys(indexData.options.columnSorting).length) {
    for (let columnName in indexData.options.columnSorting) {
      indexData = sortColumnInIndex(
        indexData,
        await loadAllTrackedTasks(indexData, columnName),
        columnName,
        indexData.options.columnSorting[columnName]
      );
    }
  }

  if (!ignoreOptions && await configExists()) {
    await saveConfig(indexData.options);
    ignoreOptions = true;
  }

  await fs.promises.writeFile(await getIndexPath(), parseIndex.json2md(indexData, ignoreOptions));
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
    throw new Error(`Couldn't access index file: ${error.message}`);
  }
  
  try {
    const index = parseIndex.md2json(indexData);

    const config = await getConfig();
    if (config !== null) {
      index.options = { ...index.options, ...config };
    }
    return index;
  } catch (error) {
    throw new Error(`Unable to parse index: ${error.message}`);
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
    throw new Error("Not initialised in this folder");
  }
  taskId = fileUtils.removeFileExtension(taskId);

  if (!(await fileUtils.exists(fileUtils.getTaskPath(await getTaskFolderPath(), taskId)))) {
    throw new Error(`No task file found with id "${taskId}"`);
  }

  if (!(columnName in index.columns)) {
    throw new Error(`Column "${columnName}" doesn't exist`);
  }

  if (taskUtils.taskInIndex(index, taskId)) {
    throw new Error(`Task "${taskId}" is already in the index`);
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
    throw new Error("Not initialised in this folder");
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
  const glob = require('glob-promise');
  const path = require('path');
  
  // Check if this folder has been initialised
  if (!(await initialised())) {
    throw new Error("Not initialised in this folder");
  }

  const trackedTasks = getTrackedTaskIds(index);

  const files = await glob(`${await getTaskFolderPath()}/*.md`);
  const untrackedTasks = new Set(files.map((task) => path.parse(task).name));

  return new Set([...untrackedTasks].filter((x) => !trackedTasks.has(x)));
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
    throw new Error("Not initialised in this folder");
  }
  taskId = fileUtils.removeFileExtension(taskId);

  if (!(await fileUtils.exists(fileUtils.getTaskPath(await getTaskFolderPath(), taskId)))) {
    throw new Error(`No task file found with id "${taskId}"`);
  }

  if (!taskUtils.taskInIndex(index, taskId)) {
    throw new Error(`Task "${taskId}" is not in the index`);
  }

  if (!taskData.name) {
    throw new Error("Task name cannot be blank");
  }

  const originalTaskData = await loadTask(taskId);
  if (originalTaskData.name !== taskData.name) {
    taskId = await renameTask(taskId, taskData.name);
    
    index = await loadTask(taskId);
  }

  if (columnName && !(columnName in index.columns)) {
    throw new Error(`Column "${columnName}" doesn't exist`);
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
  updateTask
};
