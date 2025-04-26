/**
 * Project Context Module
 *
 * Gathers and formats project information for AI assistance
 */

const eventBus = require('./event-bus');
const Handlebars = require('handlebars');
const RAGManager = require('./rag-manager');
const main = require('../main');
const path = require('path');
const utility = require('../utility');

class ProjectContext {
  /**
   * Create a new ProjectContext
   * @param {Object} kanbn Kanbn instance
   */
  constructor(kanbn) {
    this.kanbn = kanbn;
  }
  
  /**
   * Initialize the RAG manager
   * @returns {Promise<void>}
   */
  async initializeRAG() {
    if (!this.ragManager) {
      this.ragManager = new RAGManager(this.kanbn);
      await this.ragManager.initialize();
    }
  }

  /**
   * Get context for the project
   * @param {boolean} [includeReferences=false] Whether to include references in the context
   * @param {boolean} [includeSystemTasks=false] Whether to include system-generated tasks
   * @returns {Promise<Object>} Context object
   */
  async getContext(includeReferences = false, includeSystemTasks = false, integrationNames = []) {
    try {
      // Load index.md file to get project metadata
      const index = await this.kanbn.loadIndex();

      // Default context object
      const context = {
        projectName: index.name,
        projectDescription: index.description,
        columns: Object.keys(index.columns),
        taskCount: 0,
        tasksByColumn: {},
        tasks: {},
        tags: [],
        statistics: {}
      };
      
      // Initialize the RAG manager and load integrations if specified
      if (integrationNames && integrationNames.length > 0) {
        try {
          // Initialize RAG manager
          await this.initializeRAG();
          
          // Load all integrations into the vector store
          await this.ragManager.loadIntegrations();
          
          // Get relevant content based on the task context
          // Create a rich query from project metadata and task information to find relevant integration content
          let taskSummary = '';
          
          // Extract key task information to enhance the query
          if (context.tasks && Object.keys(context.tasks).length > 0) {
            // Get up to 5 representative tasks to include in the query
            const taskEntries = Object.entries(context.tasks).slice(0, 5);
            taskSummary = taskEntries.map(([id, task]) => {
              return `Task: ${task.name || id}\nDescription: ${task.description || 'No description'}\nTags: ${(task.tags || []).join(', ')}\n`;
            }).join('\n');
          }
          
          const query = `Project: ${context.projectName}
${context.projectDescription || ''}

Key Tasks:
${taskSummary}`;
          
          // Get relevant content for the specified integrations
          const relevantContent = await this.ragManager.getRelevantContent(query, 5);
          context.integrationsContent = relevantContent;
          
          utility.debugLog(`Loaded integrations and retrieved relevant content for query: ${query}`);
        } catch (integrationError) {
          utility.debugLog(`Error loading integrations: ${integrationError.message}`);
          context.integrationsContent = '';
        }
      }
      
      // Get all tracked tasks, handle missing methods in test environment
      let tasks = {};
      try {
        // Check if the method exists before calling it
        if (typeof this.kanbn.loadAllTrackedTasks === 'function') {
          // Pass includeSystemTasks parameter to control visibility of system tasks
          tasks = await this.kanbn.loadAllTrackedTasks(index, null, includeSystemTasks);
          utility.debugLog(`Loaded ${Object.keys(tasks).length} tasks (system tasks ${includeSystemTasks ? 'included' : 'excluded'})`);

          // Check if we actually loaded any tasks - if not, we might have missing task files
          if (Object.keys(tasks).length === 0) {
            utility.debugLog('No tasks loaded - checking filesystem directly');
            tasks = await this.loadTasksFromFilesystem(index);
          }
        } else {
          console.log('loadAllTrackedTasks method not available, using empty object');
          tasks = await this.loadTasksFromFilesystem(index);
        }
      } catch (tasksError) {
        console.error('Error loading tasks:', tasksError.message);
        tasks = await this.loadTasksFromFilesystem(index);
      }
      
      // Build the project context object with tasks and other data
      const projectContext = {
        projectName: index.name || 'Unnamed Project',
        projectDescription: index.description || 'No description available',
        columns: Object.keys(index.columns),
        taskCount: Object.keys(tasks).length,
        tasks: tasks,
        tags: []  // We'll populate this if needed
      };
      
      // Include references if requested
      if (includeReferences) {
        projectContext.references = {}; // Add any references processing here
      }
      
      eventBus.emit('contextQueried', { context: projectContext });
      return projectContext;
      
    } catch (error) {
      console.error('Error getting project context:', error.message);
      return {
        projectName: 'Kanbn Project',
        projectDescription: 'A kanban board project',
        tasks: {},
        columns: ['Backlog', 'In Progress', 'Done'],
        taskCount: 0
      };
    }
  }

  /**
   * Create system message for AI context
   * @param {Object} context - Context object
   * @returns {Object} System message for AI
   */
  createSystemMessage(context) {
    // Format the integrations section if present
    const integrationsSection = context.integrationsContent ? 
        this.formatIntegrationSection(context.integrationsContent) : 
        '';
        
    // Get board data to include in system message
    let boardData;

    // Check if we have tasks in context
    const hasTasks = context.tasks && Object.keys(context.tasks).length > 0;

    // Handle test environment and missing tasks
    const isTestEnvironment = process.env.KANBN_ENV === 'test';

    if (!hasTasks) {
      try {
        // Check filesystem for tasks
        const fs = require('fs');
        const path = require('path');
        const tasksDirPath = path.join(process.cwd(), '.kanbn', 'tasks');

        if (fs.existsSync(tasksDirPath)) {
          // Filter out system tasks (AI interactions)
          const taskFiles = fs.readdirSync(tasksDirPath).filter(file =>
            file.endsWith('.md') &&
            !file.includes('ai-request') &&
            !file.includes('ai-response')
          );

          utility.debugLog(`Found ${taskFiles.length} non-system task files in filesystem`);

          if (taskFiles.length > 0) {
            // Generate task list from files
            let taskList = '';
            const taskCount = taskFiles.length;

            for (const taskFile of taskFiles.slice(0, 5)) { // Limit to 5 tasks
              const taskId = taskFile.replace('.md', '');
              let taskName = taskId;

              try {
                const taskContent = fs.readFileSync(path.join(tasksDirPath, taskFile), 'utf8');
                const nameMatch = taskContent.match(/^# (.+)$/m);
                if (nameMatch && nameMatch[1]) {
                  taskName = nameMatch[1];
                }
              } catch (err) {
                // Use taskId as fallback
              }

              taskList += `- ${taskId}: ${taskName}\n`;
            }

            if (taskCount > 5) {
              taskList += `- ... and ${taskCount - 5} more task(s)\n`;
            }

            boardData = `Here is the current state of your board:\n\nBacklog (${taskCount} tasks):\n${taskList}`;
            utility.debugLog('Using filesystem-detected tasks for context');
          } else {
            // No non-system tasks found
            boardData = 'No project tasks found in the board.';
            utility.debugLog('No non-system tasks found in filesystem');
          }
        } else {
          // No tasks directory
          boardData = 'No tasks directory found.';
          utility.debugLog('No tasks directory found');
        }
      } catch (fsError) {
        utility.debugLog(`Error detecting tasks from filesystem: ${fsError.message}`);
        boardData = 'Error detecting tasks from filesystem.';
      }
    } else {
      // Use enhanced board data with more details
      boardData = this.extractEnhancedBoardData(context);
    }
            return {
      role: 'system',
      content: `You are a helpful project management assistant for a Kanbn task board. Your role is to help the user manage their tasks and projects.\n
    Important rules to follow:\n
    1. FOCUS ON TASKS: Your primary job is to help with tasks, not to suggest changing the board structure.\n
    2. DO NOT suggest new columns or changes to the board structure.\n
    3. The board structure is already established with these columns: ${(context.columns || []).join(', ')}.\n
    4. When asked about the project or board structure, refer to the EXISTING columns.\n
    5. For requests to create tasks, always specify which column the task should go in. Default to the first column if unsure.\n
    6. Be concise and helpful, focusing on the user's specific requests.\n
    7. CRITICAL: Never display system tasks in your responses. Only show regular project tasks to users. System tasks are identified by IDs containing 'ai-request' or 'ai-response' or descriptions containing 'automatically generated record of an AI interaction'.\n
    8. UTILIZE RAG KNOWLEDGE: When the user asks about domain-specific information, use the knowledge from integrations to provide accurate and helpful responses.\n
    9. UNDERSTAND TASK CONTEXT: Analyze task names and descriptions to understand their purpose and provide relevant insights.\n
    10. CONNECT TASKS WITH KNOWLEDGE: When appropriate, connect task information with knowledge from integrations to provide comprehensive responses.\n
    11. PRIORITIZE RELEVANCE: Focus on retrieving and presenting the most relevant information based on the user's query and current task context.\n
    11. ALWAYS MENTION SPECIFIC TASKS: When answering questions about tasks, always mention specific task names and IDs.\n
    12. PROVIDE DOMAIN EXPERTISE: Use your knowledge about databases, UI design, and other relevant domains to provide helpful advice.\n

    # IMPORTANT: TASK INFORMATION\n    When asked about tasks or what to work on, ALWAYS refer to the specific tasks below and provide detailed, helpful information about them. Use your knowledge about the task domains to provide valuable insights.\n
    # Command Recognition\n
    If the user asks you to perform a command like "init", "create", or other Kanbn CLI commands, explain that you can't directly execute commands, but provide instructions on how to run them. For example:\n
    - If asked to "init": Explain they should run 'kanbn init' in their terminal\n
    - If asked to "create a task": Explain they can run 'kanbn task add "Task Name"'\n
    - If asked about CLI commands: Provide information about available Kanbn commands\n
    # Available Kanbn Commands\n
    Kanbn has these main commands:\n
    - init: Initialize a new Kanbn board\n
    - task: Manage tasks (add, edit, remove, etc.)\n
    - column: Manage columns\n
    - sprint: Work with sprints\n
    - burndown: Generate burndown charts\n
    - chat: Interactive AI assistance (current mode)\n

    # CURRENT TASKS (REFER TO THESE IN YOUR RESPONSES)\n    ${boardData}${integrationsSection}`
    };
  }

  /**
   * Format integration content for inclusion in the system message
   * @param {string} content - Integration content from RAG retrieval
   * @returns {string} Formatted integration section
   */
  formatIntegrationSection(integrations) {
    if (!integrations || integrations === '') {
      return '';
    }
    
    // Enhanced formatting with markdown to better highlight integration knowledge
    return `\n\nDOMAIN KNOWLEDGE (Use this information to provide context-aware responses):\n\n${integrations}\n\nWhen responding to queries about domain-specific topics, refer to this knowledge appropriately.`;
  }

  /**
   * Load tasks from the filesystem directly
   * @param {Object} index - The board index
   * @returns {Object} Object with task ID as keys and task data as values
   */
  async loadTasksFromFilesystem(index) {
    try {
      const fs = require('fs');
      const path = require('path');
      
      // Define a more robust way to get the tasks directory that doesn't depend on this.kanbn.paths
      let tasksDir;
      
      // First try to use the kanbn paths if available
      if (this.kanbn && this.kanbn.paths && this.kanbn.paths.kanbn) {
        tasksDir = path.join(this.kanbn.paths.kanbn, 'tasks');
      } else {
        // Fallback to finding the tasks directory based on current working directory
        tasksDir = path.join(process.cwd(), '.kanbn', 'tasks');
      }
      
      // Check if the directory exists
      if (!fs.existsSync(tasksDir)) {
        // Use utility.debugLog safely with a fallback
        if (utility && typeof utility.debugLog === 'function') {
          utility.debugLog(`Tasks directory not found: ${tasksDir}`);
        } else {
          console.log(`Tasks directory not found: ${tasksDir}`);
        }
        return {};
      }
      
      // Get all task files
      const taskFiles = fs.readdirSync(tasksDir)
        .filter(file => file.endsWith('.md'));
      
      // Load each task
      const tasks = {};
      for (const file of taskFiles) {
        const taskId = path.basename(file, '.md');
        const taskPath = path.join(tasksDir, file);
        const taskContent = fs.readFileSync(taskPath, 'utf8');
        
        // Simple parsing to get name and description
        const nameMatch = taskContent.match(/^# (.+)$/m);
        const descriptionMatch = taskContent.match(/^# .+\n\n([\s\S]+?)(?:\n\n|$)/m);
        
        tasks[taskId] = {
          name: nameMatch ? nameMatch[1] : taskId,
          description: descriptionMatch ? descriptionMatch[1].trim() : '',
          metadata: {}
        };
      }
      
      return tasks;
    } catch (error) {
      console.error('Error loading tasks from filesystem:', error.message);
      return {};
    }
  }
  
  /**
   * Extract enhanced board data from context with more detailed information
   * @param {Object} context Project context object
   * @returns {string} Formatted enhanced board data with detailed task information
   */
  extractEnhancedBoardData(context) {
    // Basic implementation to support the createSystemMessage method
    if (!context || !context.tasks) {
      return 'No tasks available.';
    }
    
    let result = 'Current Tasks:\n';
    for (const [taskId, task] of Object.entries(context.tasks)) {
      result += `- ${taskId}: ${task.name}\n`;
      if (task.description) {
        result += `  Description: ${task.description}\n`;
      }
    }
    
    return result;
  }
}

module.exports = ProjectContext;
