const path = require('path');

/**
 * Check if a task id exists in the index
 * @param {object} index The index object
 * @param {string} taskId The task id to check
 * @return {boolean} True if the task is in the index
 */
function taskInIndex(index, taskId) {
  if (typeof taskId !== 'string') {
    return false;
  }
  return Object.values(index.columns).flat().includes(taskId);
}

/**
 * Find which column a task is in
 * @param {object} index The index object
 * @param {string} taskId The task id to find
 * @return {string|null} The name of the column, or null if the task isn't in the index
 */
function findTaskColumn(index, taskId) {
  if (typeof taskId !== 'string') {
    return null;
  }
  return Object.entries(index.columns).find(([_, tasks]) => tasks.includes(taskId))?.[0] || null;
}

/**
 * Add a task to the index
 * @param {object} index The index object
 * @param {string} taskId The task id to add
 * @param {string} columnName The name of the column to add the task to
 * @param {?number} [position=null] The position to add the task at
 * @return {object} The updated index
 */
function addTaskToIndex(index, taskId, columnName, position = null) {
  if (position === null || position >= index.columns[columnName].length) {
    index.columns[columnName].push(taskId);
  } else {
    index.columns[columnName].splice(position, 0, taskId);
  }
  return index;
}

/**
 * Remove a task from the index
 * @param {object} index The index object
 * @param {string} taskId The task id to remove
 * @return {object} The updated index
 */
function removeTaskFromIndex(index, taskId) {
  Object.values(index.columns).forEach(tasks => {
    const taskIndex = tasks.indexOf(taskId);
    if (taskIndex !== -1) {
      tasks.splice(taskIndex, 1);
    }
  });
  return index;
}

/**
 * Rename a task in the index
 * @param {object} index The index object
 * @param {string} oldTaskId The old task id
 * @param {string} newTaskId The new task id
 * @return {object} The updated index
 */
function renameTaskInIndex(index, oldTaskId, newTaskId) {
  Object.values(index.columns).forEach(tasks => {
    const taskIndex = tasks.indexOf(oldTaskId);
    if (taskIndex !== -1) {
      tasks[taskIndex] = newTaskId;
    }
  });
  return index;
}

/**
 * Get task metadata
 * @param {object} task The task object
 * @param {string} property The metadata property name
 * @return {*} The metadata property value
 */
function getTaskMetadata(task, property) {
  return task.metadata && property in task.metadata ? task.metadata[property] : null;
}

/**
 * Set task metadata
 * @param {object} task The task object
 * @param {string} property The metadata property name
 * @param {*} value The metadata property value
 * @return {object} The updated task
 */
function setTaskMetadata(task, property, value) {
  if (!task.metadata) {
    task.metadata = {};
  }
  task.metadata[property] = value;
  return task;
}

/**
 * Check if a task is completed
 * @param {object} index The index object
 * @param {object} task The task object
 * @return {boolean} True if the task is completed
 */
function taskCompleted(index, task) {
  const columnName = findTaskColumn(index, task.id);
  return (
    ('completedColumns' in index.options && 
     index.options.completedColumns.includes(columnName)) ||
    ('completed' in task.metadata && task.metadata.completed)
  );
}

module.exports = {
  taskInIndex,
  findTaskColumn,
  addTaskToIndex,
  removeTaskFromIndex,
  renameTaskInIndex,
  getTaskMetadata,
  setTaskMetadata,
  taskCompleted
};
