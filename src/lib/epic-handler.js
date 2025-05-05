/**
 * Epic Handler Module
 * 
 * Provides functionality for creating and managing epics
 * An epic is a high-level task that can be broken down into smaller tasks
 */

const AIService = require('./ai-service');
const PromptLoader = require('./prompt-loader');
const AILogging = require('./ai-logging');
const utility = require('../utility');
const path = require('path');
const FirecrawlClient = require('./firecrawl-client');

/**
 * Handle epic decomposition and creation
 */
class EpicHandler {
  /**
   * Create a new EpicHandler
   * @param {Object} kanbn The Kanbn instance
   * @param {Object} projectContext The project context
   * @param {Object} options Additional options
   */
  constructor(kanbn, projectContext = {}, promptsPath = null) {
    this.kanbn = kanbn;
    this.projectContext = projectContext;
    this.promptLoader = new PromptLoader(promptsPath || path.join(__dirname, '..', 'prompts'));
    this.aiLogging = new AILogging(kanbn);
  }

  /**
   * Decompose an epic into child tasks
   * @param {string} epicDescription The epic description
   * @param {Object} integrations Integration content
   * @param {Object} options Additional options
   * @return {Promise<Object>} The decomposed epic with child tasks
   */
  async decomposeEpic(epicDescription, integrations = null, options = {}) {
    try {
      // Enhanced debugging for API access
      console.log(`[DEBUG] EpicHandler.decomposeEpic called with description: ${epicDescription.substring(0, 50)}...`);
      
      // Initialize the AI service with better API key handling
      const apiKey = process.env.OPENROUTER_API_KEY;
      const useOllama = process.env.USE_OLLAMA === 'true';
      const model = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-opus:beta';
      
      console.log(`[DEBUG] API configuration: useOllama=${useOllama}, model=${model}, apiKeyPresent=${!!apiKey}`);
      
      if (!apiKey && !useOllama) {
        console.log('[ERROR] No OpenRouter API key found and Ollama not enabled. Please set OPENROUTER_API_KEY or USE_OLLAMA=true');
        throw new Error('API key missing: Set OPENROUTER_API_KEY environment variable or enable Ollama with USE_OLLAMA=true');
      }
      
      // Create AI service with proper configuration
      const aiService = new AIService({
        apiKey,
        model,
        useOllama
      });
      
      console.log('[DEBUG] AI service initialized successfully');

      // Use Firecrawl if enabled
      let researchResults = null;
      if (options.useFirecrawl) {
        console.log('Using Firecrawl for research');
        console.log('Firecrawl API Key:', process.env.FIRECRAWL_API_KEY ? 'Set' : 'Not set');
        console.log('Firecrawl options:', {
          depth: process.env.KANBN_FIRECRAWL_DEPTH || 3,
          maxUrls: process.env.KANBN_FIRECRAWL_MAX_URLS || 10,
          timeout: process.env.KANBN_FIRECRAWL_TIMEOUT || 120
        });
        // Define FirecrawlClient to fix undefined reference
        const FirecrawlClient = require('./firecrawl-client');

        // If repository URL is provided, analyze it
        if (options.repository) {
          console.log('[DEBUG] Analyzing repository:', options.repository);
          try {
            console.log('Starting repository research...');
            const firecrawlClient = new FirecrawlClient();
            const repoResearch = await firecrawlClient.deepResearch({
              query: `Analyze the GitHub repository: ${options.repository}`,
              maxDepth: process.env.KANBN_FIRECRAWL_DEPTH || 3,
              maxUrls: process.env.KANBN_FIRECRAWL_MAX_URLS || 10,
              timeLimit: process.env.KANBN_FIRECRAWL_TIMEOUT || 120
            });
            console.log('Repository research results:', repoResearch);
            researchResults = repoResearch;
          } catch (error) {
            console.log('[DEBUG] Error analyzing repository:', error);
          }
        }

        // Research the epic topic
        try {
          const firecrawlClient = new FirecrawlClient();
          const topicResearch = await firecrawlClient.deepResearch({
            query: epicDescription,
            maxDepth: process.env.KANBN_FIRECRAWL_DEPTH || 3,
            maxUrls: process.env.KANBN_FIRECRAWL_MAX_URLS || 10,
            timeLimit: process.env.KANBN_FIRECRAWL_TIMEOUT || 120
          });
          researchResults = researchResults ? {
            ...researchResults,
            insights: [...(researchResults.insights || []), ...(topicResearch.insights || [])],
            references: [...(researchResults.references || []), ...(topicResearch.references || [])]
          } : topicResearch;
        } catch (error) {
          console.log('[DEBUG] Error researching topic:', error);
        }
      }

      // Load the epic prompt template
      let epicPrompt = await this.promptLoader.loadPrompt('epic-decomposition');
      
      if (!epicPrompt) {
        // Fallback prompt if the file doesn't exist
        epicPrompt = this.getDefaultEpicPrompt();
      }

      // Add research results to context
      let context = {};
      if (researchResults) {
        context.research = {
          references: researchResults.references || [],
          insights: researchResults.insights || [],
          summary: researchResults.summary || ''
        };
        console.log('Added research results to context:', context.research);
      }
      epicPrompt = `${epicPrompt}\n\n## Research Results\n${JSON.stringify(context, null, 2)}`;

      // Create system message with project context
      const systemMessage = {
        role: 'system',
        content: this.createSystemPrompt(epicPrompt, integrations)
      };

      // Create user message with epic description
      const userMessage = {
        role: 'user',
        content: `Please decompose the following epic into manageable tasks:\n\n${epicDescription}`
      };

      // Log the interaction
      await this.aiLogging.logInteraction(process.cwd(), 'request', {
        message: userMessage.content,
        context: systemMessage.content
      });

      // Call AI service with specialized epic prompt
      const response = await aiService.chatCompletion([systemMessage, userMessage], {
        logCallback: (type, data) => {
          utility.debugLog(`AI ${type}: ${JSON.stringify(data).substring(0, 200)}...`);
        }
      });

      // Parse the response
      let epicData;
      try {
        // Try to parse as JSON first
        epicData = JSON.parse(response);
      } catch (parseError) {
        utility.debugLog(`Error parsing AI response as JSON: ${parseError.message}`);
        // Fall back to extracting JSON from markdown
        epicData = this.extractJsonFromMarkdown(response);
      }

      // Log the AI response
      await this.aiLogging.logInteraction(process.cwd(), 'response', {
        message: userMessage.content,
        response: response
      });

      // Return the parsed epic data
      return epicData;
    } catch (error) {
      console.error('Error decomposing epic:', error);
      throw new Error(`Failed to decompose epic: ${error.message}`);
    }
  }

  /**
   * Create an epic task with child tasks
   * @param {Object} epicData The epic data
   * @param {Array} tasksData The child tasks data
   * @param {string} columnName The column to add the epic to (default: "Backlog")
   * @return {Promise<Object>} Object containing epic and child task IDs
   */
  async createEpicWithTasks(epicData, tasksData, columnName = "Backlog") {
    try {
      // Create the parent epic task
      const epicTaskData = {
        name: epicData.name,
        description: epicData.description || "",
        metadata: {
          ...(epicData.metadata || {}),
          type: "epic",
          created: new Date(),
          tags: [...(epicData.metadata?.tags || []), "epic"]
        }
      };

      // Add acceptance criteria if provided
      if (epicData.acceptanceCriteria && epicData.acceptanceCriteria.length > 0) {
        epicTaskData.description += "\n\n## Acceptance Criteria\n";
        epicData.acceptanceCriteria.forEach(criterion => {
          epicTaskData.description += `- ${criterion}\n`;
        });
      }

      // Create the epic task
      const epicId = await this.kanbn.createTask(epicTaskData, columnName);
      
      // Create child tasks
      const childTaskIds = [];
      
      // Define a context variable for research references if needed
      let researchContext = null;

      for (const task of tasksData) {
        // Create task data
        const childTaskData = {
          name: task.name,
          description: task.description || task.name,
          metadata: {
            parent: epicId,
            created: new Date(),
            tags: task.metadata?.tags || ['subtask'],
            sprintSuggestion: task.sprintSuggestion,
            estimatedWorkload: task.estimatedWorkload
          }
        };

        // Add references from research if available
        if (researchContext?.research?.references?.length > 0) {
          console.log('Found research references:', researchContext.research.references.length);
          const relevantRefs = researchContext.research.references.filter(ref => {
            const lowerTitle = ref.title?.toLowerCase() || '';
            const lowerDesc = ref.description?.toLowerCase() || '';
            const lowerTaskName = task.name.toLowerCase();
            const lowerTaskDesc = task.description?.toLowerCase() || '';
            const isRelevant = lowerTitle.includes(lowerTaskName) ||
                   lowerDesc.includes(lowerTaskName) ||
                   lowerTitle.includes(lowerTaskDesc) ||
                   lowerDesc.includes(lowerTaskDesc);
            if (isRelevant) {
              console.log('Found relevant reference for task:', task.name, ref);
            }
            return isRelevant;
          });

          if (relevantRefs.length > 0) {
            childTaskData.metadata.references = {
              research: relevantRefs.map(ref => ({
                title: ref.title || ref.url,
                url: ref.url,
                description: ref.description
              }))
            };
            console.log('Added references to task:', task.name, childTaskData.metadata.references);
          }
        }

        // Add references from research if available
        if (epicData.research?.references) {
          const relevantRefs = epicData.research.references.filter(ref => {
            const lowerTitle = ref.title?.toLowerCase() || '';
            const lowerDesc = ref.description?.toLowerCase() || '';
            const lowerTaskName = task.name.toLowerCase();
            const lowerTaskDesc = task.description?.toLowerCase() || '';
            return lowerTitle.includes(lowerTaskName) ||
                   lowerDesc.includes(lowerTaskName) ||
                   lowerTitle.includes(lowerTaskDesc) ||
                   lowerDesc.includes(lowerTaskDesc);
          });

          if (relevantRefs.length > 0) {
            childTaskData.metadata.references = {
              research: relevantRefs.map(ref => ({
                title: ref.title || ref.url,
                url: ref.url,
                description: ref.description
              }))
            };
          }
        }

        const childTaskId = await this.kanbn.createTask(childTaskData, columnName);
        childTaskIds.push(childTaskId);
        
        // Update the epic with child reference
        const epicTask = await this.kanbn.getTask(epicId);
        if (!epicTask.metadata.children) {
          epicTask.metadata.children = [];
        }
        epicTask.metadata.children.push(childTaskId);
        
        await this.kanbn.updateTask(epicId, epicTask);
      }
      
      return {
        epicId,
        childTaskIds
      };
    } catch (error) {
      console.error('Error creating epic with tasks:', error);
      throw new Error(`Failed to create epic with tasks: ${error.message}`);
    }
  }

  /**
   * Assign tasks to sprints based on the AI recommendations
   * @param {Array} tasks Array of tasks with sprint suggestions
   * @return {Promise<Object>} Object mapping sprint numbers to task IDs
   */
  async assignTasksToSprints(tasks) {
    try {
      // Group tasks by sprint suggestion
      const tasksBySprintId = {};
      
      for (const task of tasks) {
        if (task.sprintSuggestion) {
          if (!tasksBySprintId[task.sprintSuggestion]) {
            tasksBySprintId[task.sprintSuggestion] = [];
          }
          tasksBySprintId[task.sprintSuggestion].push(task.id);
        }
      }
      
      // Create or update sprints
      const sprintAssignments = {};
      
      for (const [sprintNumber, taskIds] of Object.entries(tasksBySprintId)) {
        try {
          // Check if sprint exists
          const index = await this.kanbn.getIndex();
          const sprint = index.sprints?.find(s => s.name === `Sprint ${sprintNumber}`);
          
          if (!sprint) {
            // Create a new sprint if it doesn't exist
            const sprintName = `Sprint ${sprintNumber}`;
            const sprintDescription = `Sprint ${sprintNumber} tasks`;
            const startDate = new Date(); // Current date
            
            // Add 2 weeks for each sprint number to stagger them
            startDate.setDate(startDate.getDate() + ((parseInt(sprintNumber) - 1) * 14));
            
            await this.kanbn.sprint(sprintName, sprintDescription, startDate);
          }
          
          // Assign tasks to the sprint
          // Note: This is a placeholder as the direct API for assigning tasks to sprints
          // would need to be implemented or extended in the Kanbn class
          sprintAssignments[sprintNumber] = taskIds;
        } catch (sprintError) {
          console.error(`Error handling sprint ${sprintNumber}:`, sprintError);
        }
      }
      
      return sprintAssignments;
    } catch (error) {
      console.error('Error assigning tasks to sprints:', error);
      throw new Error(`Failed to assign tasks to sprints: ${error.message}`);
    }
  }

  /**
   * Create a system prompt for epic decomposition
   * @param {string} basePrompt The base prompt template
   * @param {Object} integrations Integration content
   * @return {string} The complete system prompt
   */
  createSystemPrompt(basePrompt, integrations) {
    let prompt = basePrompt;

    // Add project context if available
    if (this.projectContext) {
      const contextInfo = [];
      
      if (this.projectContext.name) {
        contextInfo.push(`Project Name: ${this.projectContext.name}`);
      }
      
      if (this.projectContext.description) {
        contextInfo.push(`Project Description: ${this.projectContext.description}`);
      }
      
      if (this.projectContext.columns) {
        contextInfo.push(`Columns: ${Object.keys(this.projectContext.columns).join(', ')}`);
      }
      
      if (contextInfo.length > 0) {
        prompt += "\n\n## Project Context\n" + contextInfo.join("\n");
      }
    }

    // Add integrations context if available
    if (integrations) {
      prompt += "\n\n## Additional Context\n" + integrations;
    }

    return prompt;
  }

  /**
   * Get the default epic decomposition prompt
   * @return {string} The default prompt
   */
  getDefaultEpicPrompt() {
    return `You are an agile project management assistant. Given a high-level epic description, break it down into:
1. A parent epic with a clear description, acceptance criteria, and metadata
2. A set of child stories/tasks that together fulfill the epic
3. Recommended sprint assignments based on task dependencies

Format your response as JSON:
{
  "epic": {
    "name": "Epic name",
    "description": "Detailed description",
    "acceptanceCriteria": ["Criterion 1", "Criterion 2"]
  },
  "tasks": [
    {
      "name": "Task 1",
      "description": "Task description",
      "sprintSuggestion": 1,
      "estimatedWorkload": 3
    }
  ]
}

Each task should be specific, actionable, and sized appropriately for completion within a sprint.
Use your knowledge of agile and development best practices to provide a comprehensive breakdown.`;
  }

  /**
   * Extract JSON from markdown response
   * @param {string} markdownText The markdown text to parse
   * @return {Object} The extracted JSON object
   */
  extractJsonFromMarkdown(markdownText) {
    const jsonRegex = /```json\n([\s\S]*?)\n```|```([\s\S]*?)```/;
    const match = markdownText.match(jsonRegex);
    
    if (match && (match[1] || match[2])) {
      try {
        const jsonStr = match[1] || match[2];
        return JSON.parse(jsonStr);
      } catch (error) {
        console.error('Error parsing JSON from markdown:', error);
      }
    }
    
    // If JSON parsing fails, create a simple structure from the text
    return {
      epic: {
        name: "Extracted Epic",
        description: markdownText.split('\n\n')[0] || "Epic created from text",
        acceptanceCriteria: []
      },
      tasks: []
    };
  }
}

module.exports = EpicHandler;
