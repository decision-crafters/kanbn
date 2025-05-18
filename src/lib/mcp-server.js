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
    // Prompt versions resource
    this.server.addResource({
      name: 'prompt-versions',
      description: 'Version history of all prompts',
      schema: {
        type: 'object',
        additionalProperties: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              version: { type: 'string' },
              content: { type: 'string' },
              timestamp: { type: 'string' }
            }
          }
        }
      },
      get: async () => {
        return {
          'task-description': [
            {
              version: '1.0',
              content: this.server.prompts['task-description'].template,
              timestamp: new Date().toISOString()
            }
          ],
          'status-update': [
            {
              version: '1.0', 
              content: this.server.prompts['status-update'].template,
              timestamp: new Date().toISOString()
            }
          ],
          'epic-breakdown': [
            {
              version: '1.0',
              content: this.server.prompts['epic-breakdown'].template,
              timestamp: new Date().toISOString()
            }
          ]
        };
      }
    });

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

    // Epic templates resource
    this.server.addResource({
      name: 'epic-templates',
      description: 'Templates for different epic types',
      schema: {
        type: 'object',
        additionalProperties: {
          type: 'object',
          properties: {
            description: { type: 'string' },
            acceptanceCriteria: { type: 'array', items: { type: 'string' } },
            metadataFields: { type: 'object' }
          }
        }
      },
      get: async () => ({
        'feature': {
          description: 'New product capability',
          acceptanceCriteria: [
            'All user flows documented',
            'QA test cases written'
          ],
          metadataFields: {
            'businessValue': 'number'
          }
        },
        'technical': {
          description: 'Technical infrastructure work',
          acceptanceCriteria: [
            'Performance benchmarks met',
            'Documentation updated'
          ],
          metadataFields: {
            'complexity': 'number'
          }
        },
        'bugfix': {
          description: 'Defect resolution',
          acceptanceCriteria: [
            'Root cause identified',
            'Regression tests added'
          ],
          metadataFields: {
            'severity': 'number'
          }
        }
      })
    });

    // Column definitions resource
    this.server.addResource({
      name: 'column-definitions',
      description: 'Detailed column metadata and workflow states',
      schema: {
        type: 'object',
        additionalProperties: {
          type: 'object',
          properties: {
            description: { type: 'string' },
            workflowState: { 
              type: 'string',
              enum: ['backlog', 'active', 'completed']
            },
            taskLimit: { type: 'number' },
            color: { type: 'string' }
          }
        }
      },
      get: async () => {
        const index = await this.kanbn.getIndex();
        return index.columnMetadata || {};
      }
    });

    // Workload metrics resource
    this.server.addResource({
      name: 'workload-metrics',
      description: 'Workload statistics and burndown data',
      schema: {
        type: 'object',
        properties: {
          totalTasks: { type: 'number' },
          completedTasks: { type: 'number' },
          estimatedWorkload: { type: 'number' },
          remainingWorkload: { type: 'number' },
          columns: {
            type: 'object',
            additionalProperties: {
              type: 'object',
              properties: {
                taskCount: { type: 'number' },
                workload: { type: 'number' }
              }
            }
          }
        }
      },
      get: async () => {
        const index = await this.kanbn.getIndex();
        const tasks = await this.kanbn.loadAllTrackedTasks(index);
        
        const metrics = {
          totalTasks: Object.keys(tasks).length,
          completedTasks: 0,
          estimatedWorkload: 0,
          remainingWorkload: 0,
          columns: {}
        };

        for (const [columnName, taskIds] of Object.entries(index.columns)) {
          metrics.columns[columnName] = {
            taskCount: taskIds.length,
            workload: 0
          };

          for (const taskId of taskIds) {
            const task = tasks[taskId];
            const workload = task.metadata?.workload || 1;
            metrics.columns[columnName].workload += workload;
            metrics.estimatedWorkload += workload;
            
            if (columnName === 'Done') {
              metrics.completedTasks++;
            } else {
              metrics.remainingWorkload += workload;
            }
          }
        }

        return metrics;
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

    // Task movement tool
    this.server.addTool({
      name: 'move-task',
      description: 'Move a task between columns',
      parameters: {
        taskId: { type: 'string' },
        fromColumn: { type: 'string' },
        toColumn: { type: 'string' }
      },
      execute: async ({ taskId, fromColumn, toColumn }) => {
        const index = await this.kanbn.getIndex();
        if (!index.columns[toColumn]) {
          throw new Error(`Column "${toColumn}" does not exist`);
        }
        await this.kanbn.moveTask(taskId, fromColumn, toColumn);
        return { success: true };
      }
    });

    // Task update tool
    this.server.addTool({
      name: 'update-task',
      description: 'Update task properties',
      parameters: {
        taskId: { type: 'string' },
        updates: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            metadata: { type: 'object' }
          }
        }
      },
      execute: async ({ taskId, updates }) => {
        return await this.kanbn.updateTask(taskId, updates);
      }
    });

    // Task deletion tool
    this.server.addTool({
      name: 'delete-task',
      description: 'Delete a task',
      parameters: {
        taskId: { type: 'string' }
      },
      execute: async ({ taskId }) => {
        await this.kanbn.removeTask(taskId);
        return { success: true };
      }
    });

    // Epic creation tool
    this.server.addTool({
      name: 'create-epic',
      description: 'Break project idea into epics and stories',
      parameters: {
        projectIdea: { type: 'string' },
        framework: { 
          type: 'string',
          enum: ['scrum', 'kanban', 'custom'],
          default: 'scrum' 
        }
      },
      execute: async ({ projectIdea, framework }) => {
        const messages = [
          {
            role: 'system',
            content: `Break this project idea into epics and user stories using ${framework} framework. 
            Return as JSON with epics array containing stories arrays.`
          },
          {
            role: 'user',
            content: projectIdea
          }
        ];
        return this.ai.chatCompletion(messages);
      }
    });

    // Column creation tool
    this.server.addTool({
      name: 'create-column',
      description: 'Create a new column on the board',
      parameters: {
        name: { type: 'string' },
        description: { type: 'string' },
        workflowState: { 
          type: 'string',
          enum: ['backlog', 'active', 'completed'],
          default: 'active'
        }
      },
      execute: async ({ name, description, workflowState }) => {
        const index = await this.kanbn.getIndex();
        if (index.columns[name]) {
          throw new Error(`Column "${name}" already exists`);
        }
        index.columns[name] = [];
        index.columnMetadata = index.columnMetadata || {};
        index.columnMetadata[name] = { description, workflowState };
        await this.kanbn.saveIndex(index);
        return { success: true };
      }
    });

    // Column sorting tool
    this.server.addTool({
      name: 'sort-column',
      description: 'Sort tasks in a column',
      parameters: {
        column: { type: 'string' },
        field: { 
          type: 'string',
          enum: ['name', 'created', 'updated', 'priority'],
          default: 'name'
        },
        direction: { 
          type: 'string',
          enum: ['ascending', 'descending'],
          default: 'ascending'
        }
      },
      execute: async ({ column, field, direction }) => {
        await this.kanbn.sort(column, [{ field, direction }], true);
        return { success: true };
      }
    });

    // Prompt versioning tool
    this.server.addTool({
      name: 'rollback-prompt',
      description: 'Revert a prompt to previous version',
      parameters: {
        promptName: { type: 'string' },
        version: { type: 'string' }
      },
      execute: async ({ promptName, version }) => {
        const versions = await this.server.getResource('prompt-versions');
        if (!versions[promptName]) {
          throw new Error(`Prompt "${promptName}" not found`);
        }
        const targetVersion = versions[promptName].find(v => v.version === version);
        if (!targetVersion) {
          throw new Error(`Version ${version} not found for prompt "${promptName}"`);
        }
        this.server.prompts[promptName].template = targetVersion.content;
        return { success: true };
      }
    });

    // Context-aware task generation
    this.server.addTool({
      name: 'generate-context-task',
      description: 'Create task using current project context',
      parameters: {
        taskDescription: { type: 'string' },
        contextFields: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['relatedTasks', 'currentSprint', 'teamVelocity']
          }
        }
      },
      execute: async ({ taskDescription, contextFields }) => {
        const context = {};
        const index = await this.kanbn.getIndex();
        
        if (contextFields.includes('relatedTasks')) {
          context.relatedTasks = await this.kanbn.loadAllTrackedTasks(index);
        }
        
        const messages = [
          {
            role: 'system',
            content: `Create a well-formed task using this context: ${JSON.stringify(context)}`
          },
          {
            role: 'user',
            content: taskDescription
          }
        ];
        
        return this.ai.chatCompletion(messages);
      }
    });

    // Sprint retrospective analysis
    this.server.addTool({
      name: 'analyze-sprint',
      description: 'Perform retrospective analysis of completed sprint',
      parameters: {
        sprintId: { type: 'string' },
        analysisType: {
          type: 'string',
          enum: ['basic', 'detailed', 'metrics'],
          default: 'basic'
        }
      },
      execute: async ({ sprintId, analysisType }) => {
        const completedTasks = await this.kanbn.loadTasksInColumn('Done');
        const messages = [
          {
            role: 'system',
            content: `Analyze this sprint's completed tasks (${completedTasks.length} tasks) and provide ${analysisType} retrospective. Focus on:`
              + '\n- What went well'
              + '\n- Improvement opportunities'
              + '\n- Actionable recommendations'
          },
          {
            role: 'user',
            content: `Sprint ID: ${sprintId}\nTasks:\n${JSON.stringify(completedTasks.slice(0, 5))}`
          }
        ];
        
        return this.ai.chatCompletion(messages);
      }
    });

    // Comment management tool
    this.server.addTool({
      name: 'add-comment',
      description: 'Add comment to a task',
      parameters: {
        taskId: { type: 'string' },
        comment: { type: 'string' },
        author: { type: 'string' }
      },
      execute: async ({ taskId, comment, author }) => {
        const task = await this.kanbn.getTask(taskId);
        task.comments = task.comments || [];
        task.comments.push({
          text: comment,
          author: author || 'System',
          date: new Date().toISOString()
        });
        await this.kanbn.updateTask(taskId, task);
        return { success: true };
      }
    });
  }

  /**
   * Register MCP prompts
   */
  registerPrompts() {
    this.server.addPrompt({
      name: 'retrospective-template',
      template: `Analyze this sprint data and generate a retrospective report covering:
      
      Sprint: {{sprintName}}
      Dates: {{startDate}} to {{endDate}}
      Completed Tasks: {{taskCount}}
      
      Include sections for:
      1. Key accomplishments
      2. Challenges faced
      3. Velocity analysis
      4. Recommended improvements
      
      Format as markdown with clear section headers.`,
      variables: ['sprintName', 'startDate', 'endDate', 'taskCount']
    });

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

    this.server.addPrompt({
      name: 'epic-breakdown',
      template: `Break the project "{{name}}" into epics using this framework:
      
      Framework: {{framework}}
      Team Size: {{teamSize}}
      Timeline: {{timeline}}
      
      For each epic, include:
      - Objective
      - Key deliverables
      - Dependencies
      - Estimated story points
      
      Format the output as markdown with H2 for each epic and bullet points for details.`,
      variables: ['name', 'framework', 'teamSize', 'timeline']
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
