const faker = require('faker');
const path = require('path');
const fs = require('fs');
const os = require('os');
const parseIndex = require('../src/parse-index');
const parseTask = require('../src/parse-task');
const utility = require('../src/utility');

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

  return new Array(COUNT_RELATIONS).fill(null).map(i => {
    const randomTaskId = taskIds[faker.datatype.number(taskIds.length - 1)];
    return {
      task: randomTaskId,
      type: faker.random.arrayElement(['blocks', 'blocked by'])
    };
  });
}

/**
 * Setup a real temporary filesystem for testing
 * @param {object} options Configuration options
 * @return {object} Test fixtures including tasks, index, and testPath
 */
const setupRealFileSystem = function(options = {}) {
  const COUNT_COLUMNS = options.countColumns || 3;
  const COUNT_TASKS = options.countTasks || 10;
  const TASKS_PER_COLUMN = options.tasksPerColumn || -1;

  // Generate tasks
  let tasks, taskIds;
  if ('tasks' in options) {
    tasks = new Array(options.tasks.length).fill(null).map((v, i) => Object.assign(
      options.noRandom ? {} : generateTask(i),
      options.tasks[i]
    ));
    taskIds = tasks.filter(i => !i.untracked).map(i => utility.getTaskId(i.name));
  } else {
    tasks = new Array(COUNT_TASKS).fill(null).map((task, i) => generateTask(i));
    taskIds = tasks.map(task => utility.getTaskId(task.name));
  }

  // Add relations
  tasks.forEach(task => {
    task.relations = addRelations(taskIds);
  });

  // Generate columns
  let columns;
  if ('columns' in options) {
    columns = options.columns;
  } else {
    const columnNames = options.columnNames || new Array(COUNT_COLUMNS).fill(null).map((column, i) => `Column ${i + 1}`);
    columns = {};
    columnNames.forEach(columnName => {
      columns[columnName] = [];
    });
  }

  // Distribute tasks across columns (only if not using custom columns)
  if (!('columns' in options) && taskIds.length > 0) {
    const columnNames = Object.keys(columns);
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

  // Generate index
  const index = {
    name: 'test',
    description: faker.lorem.paragraph(),
    columns
  };
  if ('options' in options) {
    index.options = options.options;
  }

  // Create a real temporary directory
  const timestamp = Date.now();
  const tempDir = os.tmpdir();
  const testPath = path.join(tempDir, `kanbn-test-${timestamp}`);
  
  try {
    // Create the test directory structure
    const kanbnDir = path.join(testPath, '.kanbn');
    const tasksDir = path.join(kanbnDir, 'tasks');
    
    // Create directories
    fs.mkdirSync(testPath, { recursive: true });
    fs.mkdirSync(kanbnDir, { recursive: true });
    fs.mkdirSync(tasksDir, { recursive: true });
    
    // Generate and write index.md
    const indexContent = parseIndex.json2md(index);
    const indexPath = path.join(kanbnDir, 'index.md');
    fs.writeFileSync(indexPath, indexContent, 'utf8');
    
    // Generate and write task files
    tasks.forEach(task => {
      const taskId = utility.getTaskId(task.name);
      const taskContent = parseTask.json2md(task);
      const taskPath = path.join(tasksDir, `${taskId}.md`);
      fs.writeFileSync(taskPath, taskContent, 'utf8');
    });
    
    // Verify files were created
    
    if (fs.existsSync(indexPath)) {
      const indexFileContent = fs.readFileSync(indexPath, 'utf8');
    }
    
  } catch (error) {
    console.error('Error creating real test directory:', error);
    throw error;
  }

  return { tasks, index, testPath };
};

// Create a mock kanbn instance
const mockKanbn = {
  getIndex: async function() {
    return require('../src/parse-index').md2json(
      fs.readFileSync(path.join(process.cwd(), '.kanbn', 'index.md'), 'utf8')
    );
  },
  getTask: async function(taskId) {
    const taskPath = path.join(process.cwd(), '.kanbn', 'tasks', `${taskId}.md`);
    if (!fs.existsSync(taskPath)) {
      throw new Error(`No task file found for task "${taskId}"`);
    }
    return require('../src/parse-task').md2json(
      fs.readFileSync(taskPath, 'utf8')
    );
  },
  deleteTask: async function(taskId, removeFile) {
    const index = await this.getIndex();

    // Remove task from index
    for (const column in index.columns) {
      const taskIndex = index.columns[column].indexOf(taskId);
      if (taskIndex !== -1) {
        index.columns[column].splice(taskIndex, 1);
        break;
      }
    }

    // Write updated index
    fs.writeFileSync(
      path.join(process.cwd(), '.kanbn', 'index.md'),
      require('../src/parse-index').json2md(index),
      'utf8'
    );

    // Remove task file if requested
    if (removeFile) {
      const taskPath = path.join(process.cwd(), '.kanbn', 'tasks', `${taskId}.md`);
      if (fs.existsSync(taskPath)) {
        fs.unlinkSync(taskPath);
      }
    }
  }
};

// Cleanup function to remove temporary directories
const cleanup = function(testPath) {
  if (testPath && fs.existsSync(testPath)) {
    try {
      fs.rmSync(testPath, { recursive: true, force: true });
      console.error('Cleaned up test directory:', testPath);
    } catch (error) {
      console.error('Error cleaning up test directory:', error);
    }
  }
};

module.exports = setupRealFileSystem;
module.exports.mockKanbn = mockKanbn;
module.exports.cleanup = cleanup;
