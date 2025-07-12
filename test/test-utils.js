const fs = require('fs-extra');
const path = require('path');

/**
 * Initialize a Kanbn instance with a fresh board
 * @param {Kanbn} kanbn - Kanbn instance
 * @returns {Promise<void>}
 */
async function initKanbn(kanbn) {
  // Ensure .kanbn directory exists
  await fs.ensureDir(path.join(process.cwd(), '.kanbn'));
  
  // Initialize a new Kanbn board if not already initialized
  try {
    await kanbn.initialise();
  } catch (error) {
    // Board might already be initialized, which is fine
    if (!error.message.includes('already initialized')) {
      throw error;
    }
  }
  
  // Return a clean index
  return kanbn.getIndex();
}

/**
 * Create test tasks in the Kanbn board
 * @param {Kanbn} kanbn - Kanbn instance
 * @param {Array<Object>} tasks - Array of task objects
 * @returns {Promise<Array>} - Array of created task IDs
 */
async function createTestTasks(kanbn, tasks, columnName = 'Backlog') {
  const taskIds = [];
  for (const task of tasks) {
    const taskId = await kanbn.createTask(task, columnName);
    taskIds.push(taskId);
  }
  return taskIds;
}

/**
 * Reset the test environment
 * @param {string} testDir - Test directory path
 * @returns {Promise<void>}
 */
async function resetTestEnv(testDir) {
  await fs.remove(testDir);
  await fs.ensureDir(testDir);
}

module.exports = {
  initKanbn,
  createTestTasks,
  resetTestEnv
};
