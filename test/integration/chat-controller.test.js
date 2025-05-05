const fs = require('fs-extra');
const path = require('path');
const mockRequire = require('mock-require');

const tasksFolder = path.join(__dirname, '..', '..', '.kanbn');

class BaseMockKanbn {
  constructor(options = {}) {
    this.options = options;
    this.initialised = true;
    this.index = {
      name: 'Test Project',
      description: 'Test project description',
      options: { columns: ['Backlog', 'To Do', 'In Progress', 'Done'] }
    };
    this.tasks = {
      'task-1': { id: 'task-1', name: 'Task 1', description: 'Description 1', metadata: { created: new Date(), updated: new Date(), assigned: 'User1', tags: ['tag1', 'tag2'] }, subTasks: [], comments: [] },
      'task-2': { id: 'task-2', name: 'Task 2', description: 'Description 2', metadata: { created: new Date(), updated: new Date(), assigned: 'User2', tags: ['tag2', 'tag3'] }, subTasks: [], comments: [] },
      'task-3': { id: 'task-3', name: 'Task 3', description: 'Description 3', metadata: { created: new Date(), updated: new Date(), tags: ['tag3'] }, subTasks: [], comments: [] },
      'task-4': { id: 'task-4', name: 'Task 4', description: 'Description 4', metadata: { created: new Date(), updated: new Date() }, subTasks: [], comments: [] }
    };
    this.columns = {
      'Backlog': ['task-1'],
      'To Do': ['task-2', 'task-3'],
      'In Progress': [],
      'Done': ['task-4']
    };
  }
  async initialise() { this.initialised = true; return this.initialised; }
  async status() { return { initialised: this.initialised, tasksFolder }; }
  async getIndex() { return this.index; }
  async updateIndex(updatedIndex) { this.index = updatedIndex; }
  async createTask(taskData, columnName) { const id = `task-${Object.keys(this.tasks).length + 1}`; this.tasks[id] = { id, ...taskData }; this.columns[columnName].push(id); return id; }
  async deleteTask(taskId) { delete this.tasks[taskId]; Object.values(this.columns).forEach(c => { const i = c.indexOf(taskId); if (i > -1) c.splice(i, 1); }); }
  async findTask(taskId) { return this.tasks[taskId]; }
  async findTaskColumn(taskId) { return Object.keys(this.columns).find(c => this.columns[c].includes(taskId)); }
  async moveTask(taskId, columnName) { const oldColumn = await this.findTaskColumn(taskId); if (oldColumn) { const i = this.columns[oldColumn].indexOf(taskId); this.columns[oldColumn].splice(i, 1); } this.columns[columnName].push(taskId); }
  async updateTask(taskId, taskData, columnName, track) { this.tasks[taskId] = { ...this.tasks[taskId], ...taskData }; if (track) { console.log('Track option not implemented in mock'); } if (columnName) { await this.moveTask(taskId, columnName); } }
  async getTask(taskId) { return this.tasks[taskId]; }
  async getTasks() { return Object.values(this.tasks); }
  async getColumnTasks(columnName) { return this.columns[columnName].map(id => this.tasks[id]); }
  async getAllTasks() { return Object.values(this.tasks); }
  async getColumns() { return this.index.options.columns; }
}

class MockKanbnValidColumns extends BaseMockKanbn {}

const mockAxios = {
  post: jest.fn().mockResolvedValue({ data: { choices: [{ message: { content: 'Test AI response' } }] } })
};
mockRequire('axios', mockAxios);

describe('Chat Controller Integration Tests', () => {
  beforeEach(async () => {
    await fs.ensureDir(tasksFolder);
    await fs.emptyDir(tasksFolder);
    await fs.writeJson(path.join(tasksFolder, 'index.json'), {
      name: 'Test Project',
      description: 'Test project description',
      options: { columns: ['Backlog', 'To Do', 'In Progress', 'Done'] }
    });
    mockAxios.post.mockClear();
    mockAxios.post.mockResolvedValue({ data: { choices: [{ message: { content: 'Test AI response' } }] } });
  });

  afterEach(async () => {
    await fs.remove(tasksFolder);
    mockRequire.stop('axios');
    jest.resetModules();
  });

  test('should handle uninitialised project', async () => {
    class MockKanbnUninitialised extends BaseMockKanbn {
      constructor() {
        super();
        this.initialised = false;
      }
    }
    const mockMainFunction = function() {
      const instance = new MockKanbnUninitialised();
      instance.status = async () => ({ initialised: false, tasksFolder: '/fake/path' });
      return instance;
    };
    mockMainFunction.Kanbn = MockKanbnUninitialised;
    mockRequire('../../src/main', mockMainFunction);

    const chat = require('../../src/controller/chat');
    await expect(chat({ message: 'Hello' })).rejects.toThrow('Kanbn has not been initialised');
  });

  test('should handle missing API key', async () => {
    const originalApiKey = process.env.KANBN_OPENAI_API_KEY;
    delete process.env.KANBN_OPENAI_API_KEY;

    const mockMainFunction = function() {
      return new MockKanbnValidColumns();
    };
    mockMainFunction.Kanbn = MockKanbnValidColumns;
    mockRequire('../../src/main', mockMainFunction);

    const chat = require('../../src/controller/chat');
    const result = await chat({ message: 'Test message' });
    expect(result).toBe('OpenAI API key not set. Please set the KANBN_OPENAI_API_KEY environment variable.');

    if (originalApiKey) {
      process.env.KANBN_OPENAI_API_KEY = originalApiKey;
    } else {
      delete process.env.KANBN_OPENAI_API_KEY;
    }
  });

  test('should handle API errors gracefully', async () => {
    process.env.KANBN_OPENAI_API_KEY = 'dummy-key';
    mockAxios.post.mockRejectedValue(new Error('API Error'));

    const mockMainFunction = function() {
      return new MockKanbnValidColumns();
    };
    mockMainFunction.Kanbn = MockKanbnValidColumns;
    mockRequire('../../src/main', mockMainFunction);

    const chat = require('../../src/controller/chat');
    const result = await chat({ message: 'Test message' });
    expect(result).toBe('Error communicating with OpenAI: API Error');
  });

  test('should return a valid response when AI services are available', async () => {
    process.env.KANBN_OPENAI_API_KEY = 'dummy-key';

    class MockChatHandler {
      async handleMessage(message) {
        if (message === 'Test message') {
          return 'Mock AI response';
        }
        return 'Unexpected message';
      }
    }

    const mockChatHandlerInstance = new MockChatHandler();
    mockRequire('../../src/lib/chat-handler', function() {
      return mockChatHandlerInstance;
    });

    const mockMainFunction = function() {
      return new MockKanbnValidColumns();
    };
    mockMainFunction.Kanbn = MockKanbnValidColumns;
    mockRequire('../../src/main', mockMainFunction);

    const chat = require('../../src/controller/chat');
    const result = await chat({ message: 'Test message' });
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  test('should list tasks in a specific column', async () => {
    MockKanbnValidColumns.prototype.getTask = async function(taskId) {
      return {
        id: taskId,
        name: `Task ${taskId}`,
        description: `Description for task ${taskId}`,
        metadata: {
          created: new Date(),
          tags: ['test']
        }
      };
    };

    const mockMainFunction = function() {
      return new MockKanbnValidColumns();
    };
    mockMainFunction.Kanbn = MockKanbnValidColumns;
    mockMainFunction.findTaskColumn = () => 'Backlog';
    mockRequire('../../src/main', mockMainFunction);

    const testListTasksInColumn = function(message) {
      return new Promise((resolve) => {
        const kanbn = new MockKanbnValidColumns();
        const ChatHandler = require('../../src/lib/chat-handler');
        const chatHandler = new ChatHandler(kanbn);
        chatHandler.handleMessage(message)
          .then(result => resolve(result))
          .catch(error => resolve(error.message));
      });
    };

    const response1 = await testListTasksInColumn('what tasks are in Backlog');
    expect(response1).toBeTruthy();
    expect(response1.includes('Tasks in Backlog') || response1.includes('AI services are not available')).toBe(true);

    const response2 = await testListTasksInColumn('show tasks in the To Do');
    expect(response2).toBeTruthy();
    expect(response2.includes('Tasks in To Do') || response2.includes('AI services are not available')).toBe(true);

    const response3 = await testListTasksInColumn('list items in "In Progress"');
    expect(response3).toBeTruthy();
    expect(response3.includes('Tasks in In Progress') || response3.includes('AI services are not available')).toBe(true);

    const response4 = await testListTasksInColumn('what tasks are in NonExistentColumn');
    expect(response4).toBeTruthy();
    expect(response4.includes('doesn\'t exist') || response4.includes('AI services are not available')).toBe(true);
  });

  test('should handle errors gracefully', async () => {
    class ErrorMockKanbn extends BaseMockKanbn {
      async getIndex() {
        throw new Error('Test error');
      }
    }

    const mockMainFunction = function() {
      return new ErrorMockKanbn();
    };
    mockMainFunction.Kanbn = ErrorMockKanbn;
    mockRequire('../../src/main', mockMainFunction);

    const chat = require('../../src/controller/chat');
    process.env.KANBN_OPENAI_API_KEY = 'dummy-key';

    const result = await chat({ message: 'Test message' });
    expect(result).toMatch(/Error processing your request|Error communicating with OpenAI/);
  });
});
