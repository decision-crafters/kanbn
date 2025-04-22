const fs = require('fs');
const path = require('path');
const faker = require('faker');
const parseIndex = require('../src/parse-index');
const parseTask = require('../src/parse-task');
const utility = require('../src/utility');
const rimraf = require('rimraf');

const FIXTURES_DIR = path.join(__dirname, 'real-fs-fixtures');

/**
 * Generate a random task
 * @param {number} i The task index
 * @return {object} A random task object
 */
function generateTask(i) {
  const COUNT_TAGS = faker.datatype.number(5);

  return {
    name: `Task ${i + 1}`,
    description: faker.lorem.paragraph(),
    metadata: {
      created: faker.date.past(),
      update: faker.date.past(),
      due: faker.date.future(),
      tags: new Array(COUNT_TAGS).fill(null).map(i => faker.lorem.word())
    },
    subTasks: generateSubTasks(),
    relations: []
  };
}

/**
 * Generate random sub-tasks
 * @return {object[]} Random sub-tasks
 */
function generateSubTasks() {
  const COUNT_SUB_TASKS = faker.datatype.number(10);

  return new Array(COUNT_SUB_TASKS).fill(null).map(i => ({
    text: faker.lorem.sentence(),
    completed: faker.datatype.boolean()
  }));
}

/**
 * Generate random relations
 * @param {} taskIds A list of existing task ids
 * @return {object[]} Random relations
 */
function addRelations(taskIds) {
  const COUNT_RELATIONS = faker.datatype.number(4);

  const relationTypes = ['', 'blocks ', 'duplicates ', 'requires ', 'obsoletes '];
  return new Array(COUNT_RELATIONS).fill(null).map(i => ({
    task: taskIds[Math.floor(Math.random() * taskIds.length)],
    type: relationTypes[Math.floor(Math.random() * relationTypes.length)]
  }));
}

/**
 * Create a test directory with kanbn structure
 * @param {string} testName Name of the test (used for directory name)
 * @return {string} Path to the test directory
 */
function createTestDirectory(testName) {
  const testDir = path.join(FIXTURES_DIR, testName);
  
  if (fs.existsSync(testDir)) {
    rimraf.sync(testDir);
  }
  
  fs.mkdirSync(testDir, { recursive: true });
  fs.mkdirSync(path.join(testDir, '.kanbn'), { recursive: true });
  fs.mkdirSync(path.join(testDir, '.kanbn', 'tasks'), { recursive: true });
  fs.mkdirSync(path.join(testDir, '.kanbn', 'archive'), { recursive: true });
  
  return testDir;
}

/**
 * @typedef {object} fixtureOptions
 * @property {object[]} tasks A list of tasks to use
 * @property {object} columns A columns object to use
 * @property {object} options Options to put in the index
 * @property {object} countColumns The number of columns to generate (will be called 'Column 1', 'Column 2' etc.)
 * @property {number} countTasks The number of tasks to generate (will be called 'Task 1', 'Task 2' etc.)
 * @property {number} columnNames An array of column names to use (use with countColumns)
 * @property {number} tasksPerColumn The number of tasks to put in each column, -1 to put all tasks in the first
 * column
 */

/**
 * Generate an index and tasks in a real file system
 * @param {string} testName Name of the test (used for directory name)
 * @param {fixtureOptions} [options={}]
 * @return {object} The generated index and test directory path
 */
function createFixtures(testName, options = {}) {
  const testDir = createTestDirectory(testName);
  let tasks, taskIds, columns;

  if ('tasks' in options) {
    tasks = new Array(options.tasks.length).fill(null).map((v, i) => Object.assign(
      options.noRandom ? {} : generateTask(i),
      options.tasks[i]
    ));
    taskIds = tasks.filter(i => !i.untracked).map(i => utility.getTaskId(i.name));
  } else {
    const COUNT_TASKS = options.countTasks || faker.datatype.number(9) + 1;
    tasks = new Array(COUNT_TASKS).fill(null).map((v, i) => generateTask(i));
    taskIds = tasks.filter(i => !i.untracked).map(i => utility.getTaskId(i.name));
    tasks.forEach(i => addRelations(taskIds));
  }

  if ('columns' in options) {
    columns = options.columns;
  } else {
    const COUNT_COLUMNS = options.countColumns || faker.datatype.number(4) + 1;
    const TASKS_PER_COLUMN = options.tasksPerColumn || -1;
    const columnNames = options.columnNames || new Array(COUNT_COLUMNS).fill(null).map((v, i) => `Column ${i + 1}`);
    columns = Object.fromEntries(columnNames.map(i => [i, []]));
    let currentColumn = 0;
    for (let taskId of taskIds) {
      if (TASKS_PER_COLUMN === -1) {
        columns[columnNames[0]].push(taskId);
      } else {
        if (columns[columnNames[currentColumn]].length === TASKS_PER_COLUMN) {
          currentColumn = (currentColumn + 1) % columnNames.length;
        }
        columns[columnNames[currentColumn]].push(taskId);
      }
    }
  }

  const index = {
    name: 'test',
    description: faker.lorem.paragraph(),
    columns
  };
  if ('options' in options) {
    index.options = options.options;
  }

  fs.writeFileSync(
    path.join(testDir, '.kanbn', 'index.md'),
    parseIndex.json2md(index)
  );

  tasks.forEach(task => {
    fs.writeFileSync(
      path.join(testDir, '.kanbn', 'tasks', `${utility.getTaskId(task.name)}.md`),
      parseTask.json2md(task)
    );
  });

  return { index, testDir };
}

/**
 * Clean up test directory
 * @param {string} testDir Path to the test directory
 */
function cleanupFixtures(testDir) {
  if (fs.existsSync(testDir)) {
    rimraf.sync(testDir);
  }
}

/**
 * Clean up all test fixtures
 */
function cleanupAllFixtures() {
  if (fs.existsSync(FIXTURES_DIR)) {
    rimraf.sync(FIXTURES_DIR);
  }
}

module.exports = {
  createFixtures,
  cleanupFixtures,
  cleanupAllFixtures,
  createTestDirectory
};
