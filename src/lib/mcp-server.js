const { McpServer } = require('@modelcontextprotocol/typescript-sdk');
const AIService = require('./ai-service');
const ProjectContext = require('./project-context');
const ContextSerializer = require('./context-serializer');
const utility = require('../utility');

class KanbnMcpServer {
  /**
   * Create a new MCP server instance
   * @param {Object} kanbn Kanbn instance 
   * @param {Object} options Configuration options
   */
  constructor(kanbn, options = {}) {
    this.kanbn = kanbn;
    this.options = {
      port: options.port || 11434,
      model: options.model || process.env.MCP_DEFAULT_MODEL,
      debug: options.debug || false
    };

    // Initialize AI service
    this.ai = new AIService({
      apiKey: process.env.OPENROUTER_API_KEY,
      model: this.options.model,
      ollamaUrl: `http://localhost:${this.options.port}`
    });

    // Create MCP server
    this.server = McpServer.create()
      .serverInfo('kanbn-server', require('../package.json').version)
      .capabilities({
        resources: true,
        tools: true,
        prompts: true
      })
      .build();

    // Register middleware and core functionality
    this.registerAuth();
    this.registerCors();
    this.registerErrorHandling();
    this.registerResources();
    this.registerTools();
    this.registerPrompts();
  }

  /**
   * Register authentication middleware
   */
  registerAuth() {
    this.server.use(async (context, next) => {
      // Verify API key if configured
      if (process.env.MCP_API_KEY) {
        const apiKey = context.request.headers['x-api-key'];
        if (apiKey !== process.env.MCP_API_KEY) {
          context.throw(401, 'Invalid API key');
        }
      }
      await next();
    });
  }

  /**
   * Register error handling middleware
   */ 
  registerErrorHandling() {
    this.server.use(async (context, next) => {
      try {
        await next();
      } catch (error) {
        utility.debugLog(`MCP Error: ${error.message}`);
        context.status = error.status || 500;
        context.body = {
          error: error.message,
          details: process.env.DEBUG === 'true' ? error.stack : undefined
        };
      }
    });
  }

  /**
   * Register CORS middleware
   */
  registerCors() {
    this.server.use(async (context, next) => {
      const origin = context.get('Origin');
      if (process.env.MCP_ALLOWED_ORIGINS && origin) {
        const allowedOrigins = process.env.MCP_ALLOWED_ORIGINS.split(',');
        if (allowedOrigins.includes(origin)) {
          context.set('Access-Control-Allow-Origin', origin);
          context.set('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
        }
      }
      await next();
    });
  }

  /**
   * Register MCP resources
   */
  registerResources() {
    // Board state resource
    this.server.addResource({
      name: 'board-state',
      description: 'Current Kanban board state',
      schema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          columns: {
            type: 'object',
            additionalProperties: {
              type: 'array',
              items: { type: 'string' }
            }
          },
          tasks: {
            type: 'object',
            additionalProperties: { 
              $ref: '#/definitions/task' 
            }
          }
        },
        definitions: {
          task: require('../parse-task').jsonSchema
        }
      },
      get: async () => {
        const index = await this.kanbn.getIndex();
        const tasks = await this.kanbn.loadAllTrackedTasks(index);
        return {
          name: index.name,
          columns: index.columns,
          tasks: tasks
        };
      }
    });

    // Task resource
    this.server.addResource({
      name: 'task',
      description: 'Individual task data',
      schema: {
        $ref: '#/definitions/task',
        definitions: {
          task: require('../parse-task').jsonSchema
        }
      },
      get: async ({ taskId }) => {
        return await this.kanbn.getTask(taskId);
      }
    });
  }

  /**
   * Register MCP tools 
   */
  registerTools() {
    // Task creation tool
    this.server.addTool({
      name: 'create-task',
      description: 'Create a new task',
      parameters: {
        name: { type: 'string' },
        description: { type: 'string' },
        column: { type: 'string' }
      },
      execute: async ({ name, description, column }) => {
        const taskId = await this.kanbn.createTask({
          name,
          description,
          metadata: {
            created: new Date()
          }
        }, column);
        return { taskId };
      }
    });

    // Task decomposition tool
    this.server.addTool({
      name: 'decompose-task',
      description: 'Break task into subtasks using AI',
      parameters: {
        taskId: { type: 'string' },
        includeReferences: { type: 'boolean', default: false }
      },
      execute: async ({ taskId, includeReferences }) => {
        const task = await this.kanbn.getTask(taskId);
        const messages = [
          {
            role: 'system',
            content: 'You are a task decomposition assistant. Break tasks into clear, actionable subtasks.'
          },
          {
            role: 'user',
            content: `Decompose this task: ${task.name}\n\n${task.description}`
          }
        ];
        return this.ai.chatCompletion(messages);
      }
    });
  }

  /**
   * Register MCP prompts
   */
  registerPrompts() {
    this.server.addPrompt({
      name: 'task-description',
      template: `Describe the task "{{name}}" in detail including:
      - Purpose and objectives
      - Expected outcomes
      - Relevant context
      - Dependencies`,
      variables: ['name']
    });

    this.server.addPrompt({
      name: 'status-update', 
      template: `Generate a status update for "{{task}}" covering:
      - Current progress ({{progress}}%)
      - Next steps
      - Blockers
      - Estimated completion`,
      variables: ['task', 'progress']
    });
  }

  /**
   * Start the MCP server
   */
  async start() {
    try {
      await this.server.start(this.options.port);
      utility.debugLog(`MCP server running on port ${this.options.port}`);
      return true;
    } catch (error) {
      utility.error(`Failed to start MCP server: ${error.message}`);
      return false;
    }
  }

  /**
   * Stop the MCP server
   */
  async stop() {
    await this.server.stop();
    utility.debugLog('MCP server stopped');
  }
}

module.exports = KanbnMcpServer;
