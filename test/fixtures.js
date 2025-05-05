const mockFileSystem = require('mock-fs');
const faker = require('faker');
const path = require('path');
const fs = require('fs');
const parseIndex = require('../src/parse-index');
const parseTask = require('../src/parse-task');
const utility = require('../src/utility');

/**
 * Generate a random task
 * @param {number} _i The task index
 * @return {object} A random task object
 */
function generateTask(_i) {
  const COUNT_TAGS = faker.datatype.number(5);

  return {
    name: `Task ${_i + 1}`,
    description: faker.lorem.paragraph(),
    metadata: {
      created: faker.date.past(),
      update: faker.date.past(),
      due: faker.date.future(),
      tags: new Array(COUNT_TAGS).fill(null).map(_i => faker.lorem.word())
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

  return new Array(COUNT_SUB_TASKS).fill(null).map(_i => ({
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
  return new Array(COUNT_RELATIONS).fill(null).map(_i => ({
    task: taskIds[Math.floor(Math.random() * taskIds.length)],
    type: relationTypes[Math.floor(Math.random() * relationTypes.length)]
  }));
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
 * Generate an index and tasks
 * @param {fixtureOptions} [options={}]
 */
const createFixtures = (options = {}) => {
  let tasks, taskIds, columns;

  // Generate tasks
  if ('tasks' in options) {
    tasks = new Array(options.tasks.length).fill(null).map((v, _i) => Object.assign(
      options.noRandom ? {} : generateTask(_i),
      options.tasks[_i]
    ));
    taskIds = tasks.filter(i => !i.untracked).map(i => utility.getTaskId(i.name));
  } else {
    const COUNT_TASKS = options.countTasks || faker.datatype.number(9) + 1;
    tasks = new Array(COUNT_TASKS).fill(null).map((v, _i) => generateTask(_i));
    taskIds = tasks.filter(i => !i.untracked).map(i => utility.getTaskId(i.name));
    tasks.forEach(() => addRelations(taskIds));
  }

  // Generate and populate columns
  if ('columns' in options) {
    columns = options.columns;
  } else {
    const COUNT_COLUMNS = options.countColumns || faker.datatype.number(4) + 1;
    const TASKS_PER_COLUMN = options.tasksPerColumn || -1;
    const columnNames = options.columnNames || new Array(COUNT_COLUMNS).fill(null).map((v, _i) => `Column ${_i + 1}`);
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

  // Generate index
  const index = {
    name: 'test',
    description: faker.lorem.paragraph(),
    columns
  };
  if ('options' in options) {
    index.options = options.options;
  }

  // Get absolute paths
  const projectRoot = path.resolve(__dirname, '..');
  const testRoot = path.resolve(__dirname, '.');
  // Define burndownTestPath at function scope so it's available for the return statement
  let burndownTestPath;

  console.log('Debug - Paths:');
  console.log('Project root:', projectRoot);
  console.log('Test root:', testRoot);
  console.log('Burndown test dir:', path.join(testRoot, 'burndown-test'));

  // First, restore any existing mock filesystem
  try {
    // Ensure we fully restore the mock filesystem before setting up a new one
    mockFileSystem.restore();
    
    // Small delay to ensure filesystem is fully restored
    // This helps prevent race conditions in the mock-fs library
    const start = Date.now();
    while (Date.now() - start < 50) {
      // Busy wait to ensure synchronous completion
    }
  } catch (e) {
    // Ignore errors if no mock filesystem exists
    console.error('Info: Mock filesystem not restored, may not exist yet:', e.message);
  }

  try {
    // Generate in-memory files with a more defensive approach
    // First build the base configuration without test directories
    const mockConfig = {};
    
    // Load real directories that need to be preserved
    try {
      mockConfig[path.join(projectRoot, 'src')] = mockFileSystem.load(path.join(projectRoot, 'src'));
      mockConfig[path.join(projectRoot, 'routes')] = mockFileSystem.load(path.join(projectRoot, 'routes'));
      mockConfig[path.join(projectRoot, 'node_modules')] = mockFileSystem.load(path.join(projectRoot, 'node_modules'));
    } catch (loadError) {
      console.error('Warning: Error loading real directories:', loadError.message);
    }

    // Add test directory structure with unique name based on timestamp to avoid conflicts
    const timestamp = Date.now();
    burndownTestPath = path.join(testRoot, `burndown-test-${timestamp}`);
    
    // Setup test directory with .kanbn folder
    mockConfig[burndownTestPath] = {
      '.kanbn': {
        'index.md': parseIndex.json2md(index),
        'tasks': Object.fromEntries(tasks.map(i => [`${utility.getTaskId(i.name)}.md`, parseTask.json2md(i)]))
      }
    };

    // Log mock filesystem structure and paths
    console.error('Debug - Paths:');
    console.error('Project root:', projectRoot);
    console.error('Test root:', testRoot);
    console.error('Mock filesystem structure:', JSON.stringify({
      'src': 'loaded',
      'routes': 'loaded',
      'node_modules': 'loaded',
      [`test/burndown-test-${timestamp}`]: 'created with test data'
    }, null, 2));

    mockFileSystem(mockConfig);

    // Verify files exist
    console.error('Verifying files exist:');
    console.error('src exists:', fs.existsSync(path.join(projectRoot, 'src')));
    console.error('routes exists:', fs.existsSync(path.join(projectRoot, 'routes')));
    console.error('node_modules exists:', fs.existsSync(path.join(projectRoot, 'node_modules')));
    console.error(`Test directory exists: ${burndownTestPath}`, fs.existsSync(burndownTestPath));
  } catch (error) {
    console.error('Error in fixtures.js:', error);
  }

  return { tasks, index, testPath: burndownTestPath };
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
      require('../src/parse-index').json2md(index)
    );

    // Remove task file if requested
    if (removeFile) {
      const taskPath = path.join(process.cwd(), '.kanbn', 'tasks', `${taskId}.md`);
      if (fs.existsSync(taskPath)) {
        fs.unlinkSync(taskPath);
      }
    }

    return taskId;
  },
  taskExists: async function(taskId) {
    const index = await this.getIndex();
    for (const column in index.columns) {
      if (index.columns[column].includes(taskId)) {
        return true;
      }
    }
    throw new Error(`Task "${taskId}" not found in index`);
  },
  initialised: async function() {
    return fs.existsSync(path.join(process.cwd(), '.kanbn'));
  }
};

// Export the main function
module.exports = createFixtures;

// Add the mock kanbn instance
module.exports.kanbn = mockKanbn;

// Export the cleanup function with improved handling
module.exports.cleanup = () => {
  try {
    // Restore the real filesystem
    mockFileSystem.restore();
    
    // More aggressive cleanup - wait to ensure it's complete
    const start = Date.now();
    while (Date.now() - start < 100) {
      // Busy wait to ensure synchronous completion
    }
    
    return true;
  } catch (e) {
    console.error('Error cleaning up mock filesystem:', e);
    return false;
  }
};
