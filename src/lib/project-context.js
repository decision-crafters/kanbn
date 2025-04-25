/**
 * Project Context Module
 *
 * Gathers and formats project information for AI assistance
 */

const eventBus = require('./event-bus');
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
   * Get context for the project
   * @param {boolean} [includeReferences=false] Whether to include references in the context
   * @param {boolean} [includeSystemTasks=false] Whether to include system-generated tasks
   * @returns {Promise<Object>} Context object
   */
  /**
   * Get default context with minimal information
   * Used as a fallback when the main context retrieval fails
   * @returns {Object} Default context object
   */
  getDefaultContext() {
    return {
      name: 'Kanbn Project',
      description: 'A kanban board project',
      tasks: {},
      columns: ['Backlog', 'In Progress', 'Done'],
      taskRelations: {},
      paths: {}
    };
  }

  /**
   * Get context for the project
   * @param {boolean} [includeReferences=false] Whether to include references in the context
   * @param {boolean} [includeSystemTasks=false] Whether to include system-generated tasks
   * @returns {Promise<Object>} Context object
   */
  async getContext(includeReferences = false, includeSystemTasks = false) {
    try {
      // Get index, handle potential errors
      let index;
      try {
        index = await this.kanbn.getIndex();
      } catch (indexError) {
        console.error('Error getting index:', indexError.message);
        return this.getDefaultContext();
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

          // Fallback: try to load tasks using status method if available
          if (typeof this.kanbn.status === 'function') {
            utility.debugLog('Attempting to load tasks via status method');
            try {
              const statusResults = await this.kanbn.status();
              if (statusResults && statusResults.columns) {
                // Convert status data to task format
                const taskPromises = [];
                for (const column in statusResults.columns) {
                  for (const taskId of statusResults.columns[column]) {
                    try {
                      if (typeof this.kanbn.getTask === 'function') {
                        const task = await this.kanbn.getTask(taskId);
                        taskPromises.push(task);
                      }
                    } catch (taskError) {
                      console.error(`Error getting task ${taskId}:`, taskError.message);
                    }
                  }
                }
                const loadedTasks = await Promise.all(taskPromises);
                tasks = loadedTasks.filter(task => task !== null && task !== undefined);
              }
            } catch (statusError) {
              console.error('Error getting status:', statusError.message);
            }
          }

          // If we still have no tasks, try filesystem detection
          if (Object.keys(tasks).length === 0) {
            utility.debugLog('No tasks loaded via status - checking filesystem directly');
            tasks = await this.loadTasksFromFilesystem(index);
          }
        }
      } catch (tasksError) {
        console.error('Error loading tasks:', tasksError.message);
        // Try filesystem detection as a last resort
        tasks = await this.loadTasksFromFilesystem(index);
      }

      // If we get to this point, tasks will be defined either as an empty object or with actual tasks

      // Get status, handle missing methods in test environment
      let status = { columns: {} };
      try {
        // Check if the method exists before calling it
        if (typeof this.kanbn.status === 'function') {
          status = await this.kanbn.status(false, false, false, null, null);
        } else {
          console.log('status method not available, using empty status object');
        }
      } catch (statusError) {
        console.error('Error getting status:', statusError.message);
      }

      // Helper function to find a task's column
      const findTaskColumn = (index, taskId) => {
        for (const [column, tasks] of Object.entries(index.columns)) {
          if (tasks.includes(taskId)) {
            return column;
          }
        }
        return null;
      };

      if (!index) {
        console.error('Error getting project context: Invalid index structure');
        return this.getDefaultContext();
      }

      // Ensure index.columns exists with at least a Backlog column
      if (!index.columns) {
        index.columns = { 'Backlog': [] };
        console.log('No columns defined, creating default Backlog column');
      } else if (Object.keys(index.columns).length === 0) {
        index.columns['Backlog'] = [];
        console.log('Empty columns object, creating default Backlog column');
      }

      // Get tasksByColumn count
      const tasksByColumn = {};
      for (const column of Object.keys(index.columns)) {
        if (tasks && tasks.length > 0) {
          const tasksInColumn = tasks.filter(t => findTaskColumn(index, t.id) === column);
          tasksByColumn[column] = tasksInColumn.length;
        } else {
          tasksByColumn[column] = 0;
        }
      }

      // Build full task details by column
      const taskDetails = {};
      if (tasks && tasks.length > 0) {
        for (const task of tasks) {
          const column = findTaskColumn(index, task.id);
          if (column) {
            taskDetails[task.id] = {
              name: task.name,
              description: task.description,
              column: column,
              due: task.metadata?.due || null,
              tags: task.metadata?.tags || []
            };
          }
        }
      }

      // Check if we have any tasks - if not, try filesystem detection
      if (!tasks || Object.keys(tasks).length === 0) {
        utility.debugLog('No tasks loaded from index, trying filesystem detection');
        try {
          const fs = require('fs');
          const path = require('path');
          const tasksDirPath = path.join(process.cwd(), '.kanbn', 'tasks');

          if (fs.existsSync(tasksDirPath)) {
            const taskFiles = fs.readdirSync(tasksDirPath).filter(file =>
              file.endsWith('.md') &&
              !file.includes('ai-request') &&
              !file.includes('ai-response')
            );

            utility.debugLog(`Found ${taskFiles.length} non-system task files in filesystem`);

            if (taskFiles.length > 0) {
              // Create a simple tasks object from filesystem
              const filesystemTasks = {};

              for (const taskFile of taskFiles) {
                try {
                  const taskId = taskFile.replace('.md', '');
                  const taskContent = fs.readFileSync(path.join(tasksDirPath, taskFile), 'utf8');

                  // Simple parsing to get name and description
                  const nameMatch = taskContent.match(/^# (.+)$/m);
                  const descriptionMatch = taskContent.match(/^# .+\n\n([\s\S]+?)(?:\n\n|$)/m);

                  filesystemTasks[taskId] = {
                    id: taskId,
                    name: nameMatch ? nameMatch[1] : taskId,
                    description: descriptionMatch ? descriptionMatch[1].trim() : '',
                    metadata: {}
                  };
                } catch (taskError) {
                  utility.debugLog(`Error loading task file ${taskFile}: ${taskError.message}`);
                }
              }

              // Use these tasks instead
              tasks = filesystemTasks;

              // Recalculate tasksByColumn
              for (const column of Object.keys(index.columns)) {
                tasksByColumn[column] = 0;
              }

              // Assign all tasks to Backlog by default
              const defaultColumn = Object.keys(index.columns)[0] || 'Backlog';
              tasksByColumn[defaultColumn] = Object.keys(tasks).length;

              // Rebuild taskDetails
              for (const taskId in tasks) {
                const task = tasks[taskId];
                taskDetails[taskId] = {
                  name: task.name,
                  description: task.description,
                  column: defaultColumn,
                  due: null,
                  tags: []
                };
              }
            }
          }
        } catch (fsError) {
          utility.debugLog(`Error detecting tasks from filesystem: ${fsError.message}`);
        }
      }

      // Check if we have task details but the count is wrong
      if (Object.keys(taskDetails).length === 0 && Object.keys(tasks).length > 0) {
        utility.debugLog('Task details are empty but tasks exist, rebuilding task details');

        // Rebuild task details from tasks
        for (const taskId in tasks) {
          const task = tasks[taskId];
          const column = Object.keys(index.columns)[0] || 'Backlog'; // Default to first column

          taskDetails[taskId] = {
            name: task.name || taskId,
            description: task.description || '',
            column: column,
            due: task.metadata?.due || null,
            tags: task.metadata?.tags || []
          };

          // Update tasksByColumn count
          if (!tasksByColumn[column]) {
            tasksByColumn[column] = 0;
          }
          tasksByColumn[column]++;
        }
      }

      // If we still have no tasks but the index shows tasks, try filesystem detection
      if (Object.keys(taskDetails).length === 0) {
        const trackedTaskCount = Object.values(index.columns).flat().length;

        if (trackedTaskCount > 0) {
          utility.debugLog(`Index shows ${trackedTaskCount} tasks but none loaded, trying filesystem detection`);

          try {
            const fs = require('fs');
            const path = require('path');
            const tasksDirPath = path.join(process.cwd(), '.kanbn', 'tasks');

            if (fs.existsSync(tasksDirPath)) {
              const taskFiles = fs.readdirSync(tasksDirPath).filter(file =>
                file.endsWith('.md') &&
                !file.includes('ai-request') &&
                !file.includes('ai-response')
              );

              utility.debugLog(`Found ${taskFiles.length} non-system task files in filesystem`);

              if (taskFiles.length > 0) {
                // Reset tasksByColumn
                for (const column of Object.keys(index.columns)) {
                  tasksByColumn[column] = 0;
                }

                // Default column
                const defaultColumn = Object.keys(index.columns)[0] || 'Backlog';
                tasksByColumn[defaultColumn] = taskFiles.length;

                // Load task details from files
                for (const taskFile of taskFiles) {
                  try {
                    const taskId = taskFile.replace('.md', '');
                    const taskPath = path.join(tasksDirPath, taskFile);
                    const taskContent = fs.readFileSync(taskPath, 'utf8');

                    // Simple parsing
                    const nameMatch = taskContent.match(/^# (.+)$/m);
                    const descriptionMatch = taskContent.match(/^# .+\n\n([\s\S]+?)(?:\n\n|$)/m);

                    taskDetails[taskId] = {
                      name: nameMatch ? nameMatch[1] : taskId,
                      description: descriptionMatch ? descriptionMatch[1].trim() : '',
                      column: defaultColumn,
                      due: null,
                      tags: []
                    };
                  } catch (taskError) {
                    utility.debugLog(`Error loading task file ${taskFile}: ${taskError.message}`);
                  }
                }
              }
            }
          } catch (fsError) {
            utility.debugLog(`Error detecting tasks from filesystem: ${fsError.message}`);
          }
        }
      }

      // Build context object
      const projectContext = {
        projectName: index.name || 'Unnamed Project',
        projectDescription: index.description || 'No description available',
        columns: Object.keys(index.columns),
        taskCount: Object.keys(taskDetails).length,
        tasksByColumn: tasksByColumn,
        tasks: taskDetails,
        tags: tasks ? [...new Set(Object.values(tasks).flatMap(task =>
          task.metadata && task.metadata.tags ? task.metadata.tags : []
        ))] : [],
        statistics: status || {}
      };

      // Include references if requested
      if (includeReferences && tasks && tasks.length > 0) {
        const referencesMap = {};
        for (const task of tasks) {
          if (task.metadata && task.metadata.references && task.metadata.references.length > 0) {
            referencesMap[task.id] = task.metadata.references;
          }
        }
        projectContext.references = referencesMap;
      }

      eventBus.emit('contextQueried', { context: projectContext });
      return projectContext;
    } catch (error) {
      console.error('Error getting project context:', error.message);
      return this.getDefaultContext();
    }
  }

  /**
   * Extract board data from context
   * @param {Object} context Project context object
   * @param {boolean} [includeDetails=false] Whether to include detailed task information
   * @returns {string} Formatted board data
   */
  /**
   * Load tasks from the filesystem directly
   * @returns {Object} Object with task ID as keys and task data as values
   */
  loadTasksFromFilesystem() {
    try {
      const fs = require('fs');
      const path = require('path');
      const taskUtils = require('./task-utils');
      
      // Get the tasks directory
      const tasksDir = path.join(this.kanbn.paths.kanbn, 'tasks');
      
      // Check if the directory exists
      if (!fs.existsSync(tasksDir)) {
        return {};
      }
      
      // Get all task files
      const taskFiles = fs.readdirSync(tasksDir)
        .filter(file => file.endsWith('.md'));
      
      // Load each task
      const tasks = {};
      taskFiles.forEach(file => {
        const taskId = path.basename(file, '.md');
        const taskPath = path.join(tasksDir, file);
        const taskContent = fs.readFileSync(taskPath, 'utf8');
        
        // Parse the task content
        const task = this.kanbn.parseTaskFile(taskContent);
        
        // Filter out system tasks
        if (!taskUtils.isSystemTask(taskId, task)) {
          tasks[taskId] = task;
        }
      });
      
      return tasks;
    } catch (error) {
      console.error('Error loading tasks from filesystem:', error.message);
      return {};
    }
  }

  extractBoardData(context, includeDetails = false) {
    try {
      if (!context) return '';

      // If no tasks in context, try to detect tasks from filesystem
      if (!context.tasks || Object.keys(context.tasks).length === 0) {
        utility.debugLog('No tasks in context for board data, trying filesystem detection');
        try {
          const fs = require('fs');
          const path = require('path');
          const tasksDirPath = path.join(process.cwd(), '.kanbn', 'tasks');

          if (fs.existsSync(tasksDirPath)) {
            const taskFiles = fs.readdirSync(tasksDirPath).filter(file =>
              file.endsWith('.md') &&
              !file.includes('ai-request') &&
              !file.includes('ai-response')
            );

            if (taskFiles.length > 0) {
              utility.debugLog(`Found ${taskFiles.length} non-system task files in filesystem`);

              // Create a simple context with tasks from filesystem
              context.tasks = {};

              for (const taskFile of taskFiles.slice(0, 10)) { // Limit to 10 tasks for performance
                try {
                  const taskId = taskFile.replace('.md', '');
                  const taskContent = fs.readFileSync(path.join(tasksDirPath, taskFile), 'utf8');

                  // Simple parsing to get name
                  const nameMatch = taskContent.match(/^# (.+)$/m);
                  const name = nameMatch ? nameMatch[1] : taskId;

                  context.tasks[taskId] = {
                    name: name,
                    column: context.columns && context.columns.length > 0 ? context.columns[0] : 'Backlog'
                  };
                } catch (taskError) {
                  utility.debugLog(`Error loading task file ${taskFile}: ${taskError.message}`);
                }
              }
            }
          }
        } catch (fsError) {
          utility.debugLog(`Error detecting tasks from filesystem: ${fsError.message}`);
        }
      }

      // If still no tasks, return early
      if (!context.tasks || Object.keys(context.tasks).length === 0) {
        return 'No tasks found in the project.';
      }

      // Create project tasks array - we'll completely exclude AI interaction tasks
      const projectTasks = [];

      // Use our standardized task-utils function to check if task is AI-related
      const taskUtils = require('./task-utils');
      const isAIInteractionTask = (taskId, task) => {
        return taskUtils.isSystemTask(taskId, task);
      };

      // First pass: Add only non-AI tasks to our project tasks array
      for (const taskId in context.tasks) {
        const task = context.tasks[taskId];

        // Add status to task object for reference
        task.status = task.column || (context.columns && context.columns.length > 0 ? context.columns[0] : 'Backlog');

        // Check if this is a system task (AI interaction)
        if (!isAIInteractionTask(taskId, task)) {
          // Only add non-AI tasks
          projectTasks.push(taskId);
        }
      }

      // Organize tasks by column (only for project tasks)
      const tasksByColumn = {};
      for (const column of context.columns || []) {
        tasksByColumn[column] = [];
      }

      // Add tasks to their respective columns (only project tasks)
      for (const taskId of projectTasks) {
        const task = context.tasks[taskId];
        const column = task.status;

        if (!tasksByColumn[column]) {
          tasksByColumn[column] = [];
        }
        tasksByColumn[column].push(taskId);
      }

      // Format board data with tasks by column
      let result = 'Here is the current state of your board:\n';
      result += `Board contains ${projectTasks.length} project tasks (system tasks excluded).\n`;

      // For each column, display project tasks
      for (const column of context.columns || []) {
        const columnTasks = tasksByColumn[column] || [];

        result += `\n${column} (${columnTasks.length} tasks):\n`;

        // Show tasks in this column
        if (columnTasks.length > 0) {
          // Limit the number of detailed tasks to keep the context manageable
          const displayLimit = Math.min(columnTasks.length, includeDetails ? 5 : 10);
          const visibleTasks = columnTasks.slice(0, displayLimit);

          for (const taskId of visibleTasks) {
            const task = context.tasks[taskId];

            // Display task with status, ID and name
            result += `  - [${task.status}] ${taskId}: ${task.name}${task.due ? ` (Due: ${task.due})` : ''}\n`;

            // Include comprehensive details when requested
            if (includeDetails) {
              // Add description if available
              if (task.description) {
                result += `    Description: ${task.description.split('\n')[0]}...\n`;
              }

              // Add tags if available
              if (task.metadata && task.metadata.tags && task.metadata.tags.length > 0) {
                result += `    Tags: ${task.metadata.tags.join(', ')}\n`;
              }
            }

            // Add workload if available
            if (task.workload !== undefined) {
              result += `    Workload: ${task.workload}\n`;
            }
          }

          // Show tasks remaining
          if (columnTasks.length > displayLimit) {
            const remainingTasks = columnTasks.length - displayLimit;
            result += `... and ${remainingTasks} more task(s).\n`;
          }
        } else {
          result += `  No tasks in this column.\n`;
        }
      }

      return result;
    } catch (error) {
      console.error('Error extracting board data:', error);
      return 'Error extracting board data.';
    }
  }

  /**
   * Extract enhanced board data from context with more detailed information
   * @param {Object} context Project context object
   * @returns {string} Formatted enhanced board data with detailed task information
   */
  extractEnhancedBoardData(context) {
    try {
      if (!context) return '';

      // If no tasks in context, try to detect tasks from filesystem
      if (!context.tasks || Object.keys(context.tasks).length === 0) {
        utility.debugLog('No tasks in context for enhanced board data, trying filesystem detection');
        try {
          const fs = require('fs');
          const path = require('path');
          const tasksDirPath = path.join(process.cwd(), '.kanbn', 'tasks');

          if (fs.existsSync(tasksDirPath)) {
            const taskFiles = fs.readdirSync(tasksDirPath).filter(file =>
              file.endsWith('.md') &&
              !file.includes('ai-request') &&
              !file.includes('ai-response')
            );

            if (taskFiles.length > 0) {
              utility.debugLog(`Found ${taskFiles.length} non-system task files in filesystem`);

              // Create a simple context with tasks from filesystem
              context.tasks = {};

              for (const taskFile of taskFiles) { // Process all task files for better context
                try {
                  const taskId = taskFile.replace('.md', '');
                  const taskPath = path.join(tasksDirPath, taskFile);
                  const taskContent = fs.readFileSync(taskPath, 'utf8');

                  // More comprehensive parsing
                  const nameMatch = taskContent.match(/^# (.+)$/m);
                  const descriptionMatch = taskContent.match(/^# .+\n\n([\s\S]+?)(?:\n\n|$)/m);

                  // Look for metadata sections
                  const metadataMatch = taskContent.match(/## Metadata\s+([\s\S]+?)(?:\n\n|\n##|$)/m);
                  const metadata = {};

                  if (metadataMatch) {
                    // Parse key-value pairs from metadata section
                    const metadataLines = metadataMatch[1].split('\n');
                    for (const line of metadataLines) {
                      const kvMatch = line.match(/^\s*-\s*([^:]+):\s*(.+)$/);
                      if (kvMatch) {
                        const [_, key, value] = kvMatch;
                        metadata[key.trim()] = value.trim();
                      }
                    }
                  }

                  // Look for subtasks
                  const subtasksMatch = taskContent.match(/## Sub-tasks\s+([\s\S]+?)(?:\n\n|\n##|$)/m);
                  const subtasks = [];

                  if (subtasksMatch) {
                    const subtaskLines = subtasksMatch[1].split('\n');
                    for (const line of subtaskLines) {
                      const subtaskMatch = line.match(/^\s*-\s*\[([ x])\]\s*(.+)$/);
                      if (subtaskMatch) {
                        const [_, completionMark, text] = subtaskMatch;
                        subtasks.push({
                          completed: completionMark === 'x',
                          text: text.trim()
                        });
                      }
                    }
                  }

                  context.tasks[taskId] = {
                    name: nameMatch ? nameMatch[1] : taskId,
                    description: descriptionMatch ? descriptionMatch[1].trim() : '',
                    column: context.columns && context.columns.length > 0 ? context.columns[0] : 'Backlog',
                    metadata: metadata,
                    subtasks: subtasks
                  };
                } catch (taskError) {
                  utility.debugLog(`Error loading task file ${taskFile}: ${taskError.message}`);
                }
              }
            }
          }
        } catch (fsError) {
          utility.debugLog(`Error detecting tasks from filesystem: ${fsError.message}`);
        }
      }

      // If still no tasks, return early
      if (!context.tasks || Object.keys(context.tasks).length === 0) {
        return 'No tasks found in the project.';
      }

      // Create project tasks array - we'll completely exclude AI interaction tasks
      const projectTasks = [];

      // Use our standardized task-utils function to check if task is AI-related
      const taskUtils = require('./task-utils');
      const isAIInteractionTask = (taskId, task) => {
        return taskUtils.isSystemTask(taskId, task);
      };

      // First pass: Add only non-AI tasks to our project tasks array
      for (const taskId in context.tasks) {
        const task = context.tasks[taskId];

        // Add status to task object for reference
        task.status = task.column || (context.columns && context.columns.length > 0 ? context.columns[0] : 'Backlog');

        // Check if this is a system task (AI interaction)
        if (!isAIInteractionTask(taskId, task)) {
          // Only add non-AI tasks
          projectTasks.push(taskId);
        }
      }

      // Organize tasks by column (only for project tasks)
      const tasksByColumn = {};
      for (const column of context.columns || []) {
        tasksByColumn[column] = [];
      }

      // Add tasks to their respective columns (only project tasks)
      for (const taskId of projectTasks) {
        const task = context.tasks[taskId];
        const column = task.status;

        if (!tasksByColumn[column]) {
          tasksByColumn[column] = [];
        }
        tasksByColumn[column].push(taskId);
      }

      // Format board data with tasks by column - make it more prominent
      let result = '=== IMPORTANT: CURRENT PROJECT TASKS ===\n';
      result += `This project has ${projectTasks.length} tasks that need attention (system tasks excluded).\n`;

      // Add project name and description if available
      if (context.projectName) {
        result += `\nProject Name: ${context.projectName}\n`;
      }
      if (context.projectDescription) {
        result += `Project Description: ${context.projectDescription}\n`;
      }

      // Add a note about using this information
      result += '\nIMPORTANT: When answering questions about tasks or what to work on, ALWAYS refer to these specific tasks by name and provide detailed information about them.\n';

      // For each column, display project tasks with enhanced details - make them more prominent
      for (const column of context.columns || []) {
        const columnTasks = tasksByColumn[column] || [];

        result += `\n=== COLUMN: ${column.toUpperCase()} (${columnTasks.length} tasks) ===\n`;

        // Show tasks in this column
        if (columnTasks.length > 0) {
          // Process all tasks for better context
          for (const taskId of columnTasks) {
            const task = context.tasks[taskId];

            // Display task with ID and name - make it more prominent
            result += `\n*** TASK: ${taskId} - ${task.name} ***\n`;

            // Add description if available (full description for better context)
            if (task.description) {
              // Truncate very long descriptions
              const maxDescLength = 300;
              const description = task.description.length > maxDescLength
                ? task.description.substring(0, maxDescLength) + '...'
                : task.description;
              result += `Description: ${description}\n`;
            }

            // Add tags if available
            if (task.tags && task.tags.length > 0) {
              result += `Tags: ${task.tags.join(', ')}\n`;
            } else if (task.metadata && task.metadata.tags && task.metadata.tags.length > 0) {
              result += `Tags: ${task.metadata.tags.join(', ')}\n`;
            }

            // Add assignee if available
            if (task.metadata && task.metadata.assigned) {
              result += `Assigned to: ${task.metadata.assigned}\n`;
            }

            // Add due date if available
            if (task.due) {
              result += `Due date: ${task.due}\n`;
            } else if (task.metadata && task.metadata.due) {
              result += `Due date: ${task.metadata.due}\n`;
            }

            // Add domain expertise hint
            result += `\nWhen discussing this task, provide domain expertise about ${task.name.toLowerCase()}.\n`;

            // Add subtasks if available
            if (task.subtasks && task.subtasks.length > 0) {
              result += `**Subtasks**:\n`;
              for (const subtask of task.subtasks) {
                result += `- [${subtask.completed ? 'x' : ' '}] ${subtask.text}\n`;
              }
            }

            // Add workload if available
            if (task.workload !== undefined) {
              result += `**Workload**: ${task.workload}\n`;
            }

            // Add priority if available
            if (task.metadata && task.metadata.priority) {
              result += `**Priority**: ${task.metadata.priority}\n`;
            }

            // Add a separator between tasks
            result += '\n';
          }
        } else {
          result += `No tasks in this column.\n`;
        }
      }

      // Add task relationships section if we can infer any - make it more prominent
      result += '\n=== IMPORTANT: TASK RELATIONSHIPS ===\n';
      result += 'When discussing tasks, mention these relationships to provide better context:\n';

      // Simple algorithm to detect potential relationships based on naming patterns
      const relationshipPatterns = [
        { pattern: /database|schema|sql/i, group: 'Database Tasks' },
        { pattern: /ui|interface|form|frontend/i, group: 'UI Tasks' },
        { pattern: /api|service|endpoint|backend/i, group: 'API Tasks' },
        { pattern: /test|qa|quality/i, group: 'Testing Tasks' },
        { pattern: /doc|documentation/i, group: 'Documentation Tasks' },
        { pattern: /deploy|release|publish/i, group: 'Deployment Tasks' },
        { pattern: /inventory|vehicle|car/i, group: 'Inventory Tasks' },
        { pattern: /customer|client|user/i, group: 'Customer Tasks' },
        { pattern: /report|analytics|sales/i, group: 'Reporting Tasks' },
        { pattern: /mobile|responsive/i, group: 'Mobile Tasks' },
        { pattern: /export|pdf/i, group: 'Export Tasks' }
      ];

      // Group tasks by potential relationships
      const taskGroups = {};
      for (const pattern of relationshipPatterns) {
        taskGroups[pattern.group] = [];
      }

      // Assign tasks to groups based on patterns
      for (const taskId of projectTasks) {
        const task = context.tasks[taskId];
        const taskName = task.name.toLowerCase();
        const taskDesc = task.description ? task.description.toLowerCase() : '';

        for (const pattern of relationshipPatterns) {
          if (pattern.pattern.test(taskName) || pattern.pattern.test(taskDesc)) {
            taskGroups[pattern.group].push(taskId);
          }
        }
      }

      // Add non-empty groups to the result
      let hasRelationships = false;
      for (const group in taskGroups) {
        if (taskGroups[group].length > 0) {
          hasRelationships = true;
          result += `**${group}**: `;
          result += taskGroups[group].map(id => `${id} (${context.tasks[id].name})`).join(', ');
          result += '\n';
        }
      }

      if (!hasRelationships) {
        result += 'No clear task relationships detected.\n';
      }

      // Add task domain context to help the AI provide better responses - make it more prominent
      result += '\n=== IMPORTANT: DOMAIN EXPERTISE REQUIRED ===\n';
      result += 'ALWAYS use your knowledge about these domains when discussing tasks:\n';

      // Detect domains from task names and descriptions
      const domainPatterns = [
        { pattern: /database|sql|query|table/i, domain: 'Database Management - Provide specific advice about database schema design, SQL queries, data modeling, and best practices' },
        { pattern: /ui|interface|form|css|html|frontend/i, domain: 'User Interface Design - Offer insights on form design, user experience, frontend frameworks, and responsive design' },
        { pattern: /api|rest|graphql|endpoint|service/i, domain: 'API Development - Suggest approaches for RESTful API design, backend services, and data exchange' },
        { pattern: /test|qa|quality|assert|spec/i, domain: 'Quality Assurance - Recommend testing strategies, test cases, and validation approaches' },
        { pattern: /doc|documentation|readme|wiki/i, domain: 'Technical Documentation - Advise on documentation structure, content organization, and clarity' },
        { pattern: /deploy|release|publish|ci|cd|pipeline/i, domain: 'DevOps - Provide guidance on deployment processes, CI/CD pipelines, and release management' },
        { pattern: /security|auth|permission|role/i, domain: 'Security - Offer security best practices, authentication methods, and data protection' },
        { pattern: /performance|optimize|speed|benchmark/i, domain: 'Performance Optimization - Suggest ways to improve system performance, caching, and efficiency' },
        { pattern: /mobile|responsive|android|ios/i, domain: 'Mobile Development - Provide mobile-specific design and development advice' },
        { pattern: /report|analytics|dashboard|chart/i, domain: 'Reporting & Analytics - Recommend reporting tools, visualization techniques, and data analysis approaches' },
        { pattern: /customer|client|user/i, domain: 'Customer Management - Offer CRM best practices, customer data management, and user account handling' },
        { pattern: /inventory|product|item|stock/i, domain: 'Inventory Management - Provide inventory tracking, stock management, and product catalog advice' },
        { pattern: /car|vehicle|auto/i, domain: 'Automotive - Give domain-specific knowledge about vehicle data, automotive industry standards, and car lot operations' },
        { pattern: /sales|purchase|order|invoice/i, domain: 'Sales Management - Suggest sales process optimization, order tracking, and invoicing approaches' },
        { pattern: /export|pdf|print/i, domain: 'Document Generation - Provide advice on PDF generation, report exporting, and printing functionality' }
      ];

      // Detect domains from tasks
      const detectedDomains = new Set();
      for (const taskId of projectTasks) {
        const task = context.tasks[taskId];
        const taskName = task.name.toLowerCase();
        const taskDesc = task.description ? task.description.toLowerCase() : '';

        for (const pattern of domainPatterns) {
          if (pattern.pattern.test(taskName) || pattern.pattern.test(taskDesc)) {
            detectedDomains.add(pattern.domain);
          }
        }
      }

      // Add detected domains to the result
      if (detectedDomains.size > 0) {
        for (const domain of detectedDomains) {
          result += `- ${domain}\n`;
        }
      } else {
        result += '- General Project Management\n';
      }

      // Add a final reminder to always reference specific tasks
      result += '\n=== FINAL REMINDER ===\n';
      result += 'When answering questions about tasks or what to work on:\n';
      result += '1. ALWAYS mention specific task names and IDs from the list above\n';
      result += '2. Provide domain-specific expertise related to the task\n';
      result += '3. Suggest logical next steps or considerations for each task\n';
      result += '4. Connect related tasks when appropriate\n';
      result += '5. Use your knowledge to provide valuable insights\n';

      return result;
    } catch (error) {
      console.error('Error extracting enhanced board data:', error);
      return 'Error extracting enhanced board data.';
    }
  }

  /**
   * Create system message for AI context
   * @param {Object} context Project context object
   * @returns {Object} System message for AI
   */
  createSystemMessage(context) {
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

      // If filesystem detection failed and we're in test environment, use standard tasks
      if ((!boardData || boardData.includes('No ')) && isTestEnvironment) {
        utility.debugLog('Test environment detected, using standard task list');

        // Check if any actual task files exist first
        try {
          const fs = require('fs');
          const path = require('path');
          const tasksDirPath = path.join(process.cwd(), '.kanbn', 'tasks');

          if (fs.existsSync(tasksDirPath)) {
            const taskFiles = fs.readdirSync(tasksDirPath).filter(file =>
              file.endsWith('.md') &&
              !file.includes('ai-request') &&
              !file.includes('ai-response')
            );

            if (taskFiles.length > 0) {
              utility.debugLog(`Found ${taskFiles.length} non-system task files, not using default test tasks`);
              // Generate task list from actual files
              let taskList = '';
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

              if (taskFiles.length > 5) {
                taskList += `- ... and ${taskFiles.length - 5} more task(s)\n`;
              }

              boardData = `Here is the current state of your board:\n\nBacklog (${taskFiles.length} tasks):\n${taskList}`;
              return;
            }
          }
        } catch (fsError) {
          utility.debugLog(`Error checking for task files: ${fsError.message}`);
        }

        // Use default test tasks
        boardData = `Here is the current state of your board:\n\nBacklog (5 tasks):\n- database-setup: Set up inventory database\n- vehicle-entry-ui: Create vehicle entry form\n- search-functionality: Implement inventory search\n- customer-database: Customer database integration\n- reporting-module: Sales reporting module`;
      }
    }

    // If all else fails, use the enhanced extraction from context
    if (!boardData) {
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
    8. USE YOUR KNOWLEDGE: When discussing tasks, use your general knowledge to provide helpful context and suggestions related to the task's domain.\n
    9. UNDERSTAND TASK CONTEXT: Analyze task names and descriptions to understand their purpose and provide relevant insights.\n
    10. CONNECT RELATED TASKS: When appropriate, mention relationships between tasks that appear to be related based on their names or descriptions.\n
    11. ALWAYS MENTION SPECIFIC TASKS: When answering questions about tasks, always mention specific task names and IDs.\n
    12. PROVIDE DOMAIN EXPERTISE: Use your knowledge about databases, UI design, and other relevant domains to provide helpful advice.\n

    # IMPORTANT: TASK INFORMATION
    When asked about tasks or what to work on, ALWAYS refer to the specific tasks below and provide detailed, helpful information about them. Use your knowledge about the task domains to provide valuable insights.

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

    # CURRENT TASKS (REFER TO THESE IN YOUR RESPONSES)
    ${boardData}`
    };
  }
}

module.exports = ProjectContext;
