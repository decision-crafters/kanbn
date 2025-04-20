const QUnit = require('qunit');
const path = require('path');
const fs = require('fs');
const rimraf = require('rimraf');
const mockRequire = require('mock-require');

const testFolder = path.join(__dirname, '..', 'test-chat-infrastructure');

// Mock API Response Generator
const createMockResponse = (content) => ({
    data: {
        choices: [{
            message: { content }
        }]
    }
});

// Mock axios for API testing
class MockAxios {
    constructor() {
        this.reset();
    }

    reset() {
        this.responses = [];
        this.requests = [];
        this.errorResponses = [];
        this.requestCount = 0;
    }

    addResponse(content) {
        this.responses.push(createMockResponse(content));
    }

    addError(error) {
        this.errorResponses.push(error);
    }

    post(url, data, config) {
        this.requestCount++;
        this.requests.push({ url, data, config });

        if (this.errorResponses.length > 0) {
            const error = this.errorResponses.shift();
            return Promise.reject(error);
        }

        const response = this.responses.shift() || createMockResponse('Mock API Response');
        return Promise.resolve(response);
    }

    getRequestCount() {
        return this.requestCount;
    }

    getLastRequest() {
        return this.requests[this.requests.length - 1];
    }
}

// Mock filesystem for persistence testing
class MockFS {
    constructor() {
        this.files = new Map();
        this.errors = new Map();
    }

    setFileContent(path, content) {
        const normalizedPath = path.replace(/\\/g, '/');
        this.files.set(normalizedPath, content);
    }

    setFileError(path, error) {
        const normalizedPath = path.replace(/\\/g, '/');
        this.errors.set(normalizedPath, error);
    }

    readFileSync(path, encoding) {
        const normalizedPath = path.replace(/\\/g, '/');
        if (this.errors.has(normalizedPath)) {
            throw this.errors.get(normalizedPath);
        }
        return this.files.get(normalizedPath) || '';
    }

    writeFileSync(path, content) {
        const normalizedPath = path.replace(/\\/g, '/');
        if (this.errors.has(normalizedPath)) {
            throw this.errors.get(normalizedPath);
        }
        this.files.set(normalizedPath, content);
    }

    existsSync(path) {
        const normalizedPath = path.replace(/\\/g, '/');
        return this.files.has(normalizedPath);
    }

    mkdirSync(path, options) {
        const normalizedPath = path.replace(/\\/g, '/');
        this.files.set(normalizedPath, '');
    }
}

// Mock Kanbn for testing
class MockKanbn {
    constructor() {
        this.tasks = new Map();
        this.columns = { 'Backlog': [] };
    }

    async initialised() {
        return true;
    }

    async getIndex() {
        return {
            name: 'Test Project',
            description: 'Test Infrastructure',
            columns: this.columns
        };
    }

    async loadAllTrackedTasks() {
        return Array.from(this.tasks.values());
    }

    async createTask(taskData, column) {
        const taskId = `task-${Date.now()}`;
        this.tasks.set(taskId, { ...taskData, id: taskId });
        if (!this.columns[column]) {
            this.columns[column] = [];
        }
        this.columns[column].push(taskId);
        return taskId;
    }

    async status() {
        return {};
    }
}

QUnit.module('Chat Infrastructure', {
    before: function() {
        this.originalEnv = { ...process.env };
        this.mockAxios = new MockAxios();
        this.mockFS = new MockFS();
        this.mockKanbn = new MockKanbn();

        mockRequire('axios', {
            post: (...args) => this.mockAxios.post(...args)
        });

        mockRequire('fs', {
            ...this.mockFS,
            mkdirSync: (...args) => this.mockFS.mkdirSync(...args)
        });

        const mockKanbn = new MockKanbn();
        mockRequire('../../src/main', {
            Kanbn: function() { return mockKanbn; },
            findTaskColumn: (index, taskId) => {
                for (const [column, tasks] of Object.entries(index.columns)) {
                    if (tasks.includes(taskId)) {
                        return column;
                    }
                }
                return null;
            },
            // Export the Kanbn class as both a named export and a property
            // This ensures compatibility with both import styles
            default: {
                Kanbn: function() { return mockKanbn; },
                findTaskColumn: (index, taskId) => {
                    for (const [column, tasks] of Object.entries(index.columns)) {
                        if (tasks.includes(taskId)) {
                            return column;
                        }
                    }
                    return null;
                }
            }
        });
        this.mockKanbn = mockKanbn;

        // Set up test environment
        process.env = {
            ...process.env,
            KANBN_ENV: 'test',
            OPENROUTER_API_KEY: 'test-api-key',
            NODE_ENV: 'test'
        };

        // Clear module cache
        delete require.cache[require.resolve('../../src/controller/chat')];
    },

    after: function() {
        process.env = this.originalEnv;
        mockRequire.stopAll();
    },

    beforeEach: function() {
        // Reset mocks
        this.mockAxios.reset();
        this.mockFS.files.clear();
        this.mockFS.errors.clear();

        // Reset chat history
        global.chatHistory = [];

        // Set up test directory and project
        this.mockFS.mkdirSync(testFolder, { recursive: true });
        this.mockFS.mkdirSync(path.join(testFolder, '.kanbn'));
        this.mockFS.mkdirSync(path.join(testFolder, '.kanbn', 'tasks'));

        // Initialize project index
        this.mockFS.writeFileSync(path.join(testFolder, '.kanbn', 'index.md'), `
# Test Project

Test Infrastructure

## Backlog

## In Progress
        `);

        // Ensure API key is set
        process.env.OPENROUTER_API_KEY = 'test-api-key';

        // Clear module cache to ensure fresh instance
        delete require.cache[require.resolve('../../src/controller/chat')];
    }
});

QUnit.test('should handle network errors gracefully', async function(assert) {
    const chat = require('../../src/controller/chat');

    // Reset environment
    process.env.KANBN_ENV = 'production';

    this.mockAxios.addError(new Error('Network Error'));
    const result = await chat({ message: 'Test message' });
    assert.equal(typeof result, 'string', 'Returns string response');
    assert.ok(result.includes("having trouble"), 'Returns error message');
    assert.ok(result.includes('Network Error'), 'Includes specific error');

    // Restore test environment
    process.env.KANBN_ENV = 'test';
});

QUnit.test('should handle invalid API key', async function(assert) {
    const chat = require('../../src/controller/chat');

    delete process.env.OPENROUTER_API_KEY;

    const result = await chat({ message: 'Test message' });
    assert.equal(typeof result, 'string', 'Returns string response');
    assert.ok(result.includes('OpenRouter API key not found'), 'Returns API key error');

    process.env.OPENROUTER_API_KEY = 'test-api-key';
});

QUnit.test('should handle rate limit responses', async function(assert) {
    const chat = require('../../src/controller/chat');

    // Set production mode to trigger error handling
    process.env.KANBN_ENV = 'production';

    this.mockAxios.addError(new Error('Rate limit exceeded'));

    const result = await chat({ message: 'Test message' });
    assert.equal(typeof result, 'string', 'Returns string response');
    assert.ok(result.includes("having trouble"), 'Returns error message');
    assert.ok(result.includes("Rate limit"), 'Includes rate limit info');

    // Restore test environment
    process.env.KANBN_ENV = 'test';
});

QUnit.test('should persist chat history', async function(assert) {
    const chat = require('../../src/controller/chat');

    const result = await chat({ message: 'Test message' });
    assert.equal(typeof result, 'string', 'Returns string response');
    assert.ok(result.includes('project management assistant'), 'Returns mock response');

    // Verify task creation
    const tasks = Array.from(this.mockKanbn.tasks.values());
    const aiTask = tasks.find(t => t.metadata?.tags?.includes('ai-interaction'));

    assert.ok(aiTask, 'Chat interaction was logged');
    assert.ok(aiTask.comments?.[0]?.text.includes('Test message'), 'Log contains user message');
});

QUnit.test('should handle persistence errors', async function(assert) {
    const chat = require('../../src/controller/chat');

    this.mockFS.setFileError(path.join(testFolder, '.kanbn', 'tasks', 'ai-interaction'), new Error('Write failed'));

    const result = await chat({ message: 'Test message' });
    assert.equal(typeof result, 'string', 'Returns string response');
    assert.ok(result.includes('project management assistant'), 'Returns response despite error');
});

QUnit.test('should maintain chat context across sessions', async function(assert) {
    const chat = require('../../src/controller/chat');

    // Set production mode to force real API calls
    process.env.KANBN_ENV = 'production';

    // Reset chat history
    global.chatHistory = [];

    // First interaction
    this.mockAxios.addResponse('Initial project status');
    const result1 = await chat({ message: 'Tell me about the project' });
    assert.ok(result1.includes('Initial project status'), 'First response received');

    // Verify first request
    const firstRequest = this.mockAxios.requests[0];
    assert.ok(firstRequest.data.messages?.length >= 2, 'First request has messages');
    assert.equal(firstRequest.data.messages[1].content, 'Tell me about the project', 'Contains first message');

    // Second interaction with context
    this.mockAxios.addResponse('Status updated');
    const result2 = await chat({ message: 'Update the status' });
    assert.ok(result2.includes('Status updated'), 'Second response received');

    // Verify message history
    const messages = this.mockAxios.requests[1].data.messages;
    assert.ok(messages && Array.isArray(messages), 'Has messages array');
    assert.ok(messages[0].role === 'system', 'Has system message');
    assert.ok(messages.slice(1).every(m => m.role === 'user' || m.role === 'assistant'), 'Has proper message roles');

    // Verify user messages
    const userMessages = messages.filter(m => m.role === 'user');
    assert.equal(userMessages.length, 2, 'Has two user messages');
    assert.deepEqual(
        userMessages.map(m => m.content),
        ['Tell me about the project', 'Update the status'],
        'Messages in correct order'
    );

    // Restore test environment
    process.env.KANBN_ENV = 'test';
});
