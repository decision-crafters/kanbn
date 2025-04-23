const fs = require('fs');
const path = require('path');

/**
 * Check if a file exists
 * @param {string} filePath Path to check
 * @return {Promise<boolean>} True if the file exists, otherwise false
 */
async function exists(filePath) {
  try {
    await fs.promises.access(filePath, fs.constants.F_OK);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get the path to a task file
 * @param {string} taskFolder The task folder
 * @param {string} taskId The task id
 * @return {string} The task path
 */
function getTaskPath(taskFolder, taskId) {
  if (typeof taskFolder !== 'string') {
    return '';
  }
  const taskIdWithExt = addFileExtension(taskId);
  if (typeof taskIdWithExt !== 'string') {
    return taskFolder;
  }
  return path.join(taskFolder, taskIdWithExt);
}

/**
 * Add file extension to a task id if necessary
 * @param {string} taskId The task id
 * @return {string} The task id with file extension
 */
function addFileExtension(taskId) {
  if (typeof taskId !== 'string') {
    return '';
  }
  return taskId.endsWith('.md') ? taskId : `${taskId}.md`;
}

/**
 * Remove file extension from a task id if necessary
 * @param {string} taskId The task id
 * @return {string} The task id without file extension
 */
function removeFileExtension(taskId) {
  if (typeof taskId !== 'string') {
    return '';
  }
  return taskId.endsWith('.md') ? taskId.substring(0, taskId.length - 3) : taskId;
}

module.exports = {
  exists,
  getTaskPath,
  addFileExtension,
  removeFileExtension
};
