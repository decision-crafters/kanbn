const fs = require('fs');
const path = require('path');
const { Kanbn } = require('./src/main');
const ProjectContext = require('./src/lib/project-context');
const EpicHandler = require('./src/lib/epic-handler');

async function testEpicDecomposition() {
  try {
    // Log environment configuration
    console.log('=== Environment Configuration ===');
    console.log('USE_OLLAMA:', process.env.USE_OLLAMA === 'true' ? 'true' : 'false');
    console.log('AI Service:', process.env.USE_OLLAMA === 'true' ? 'Ollama' : 'OpenRouter');
    if (process.env.USE_OLLAMA === 'true') {
      console.log('OLLAMA_MODEL:', process.env.OLLAMA_MODEL || '(using first available)');
      console.log('OLLAMA_HOST:', process.env.OLLAMA_HOST);
    } else {
      console.log('OPENROUTER_MODEL:', process.env.OPENROUTER_MODEL);
      console.log('OPENROUTER_API_KEY:', process.env.OPENROUTER_API_KEY ? '(set)' : '(not set)');
    }
    console.log('\n=== Environment Variables ===');
    console.log('OpenRouter API Key:', process.env.OPENROUTER_API_KEY ? `Set (${process.env.OPENROUTER_API_KEY.substring(0, 5)}...)` : 'Not set');
    console.log('OpenRouter Model:', process.env.OPENROUTER_MODEL || 'Not set');
    console.log('Use Ollama:', process.env.USE_OLLAMA === 'true' ? 'Enabled' : 'Disabled');
    console.log('Debug:', process.env.DEBUG === 'true' ? 'Enabled' : 'Disabled');

    // Create test directory
    const testDir = '/tmp/kanbn-epic-test';
    console.log('\n=== Creating Test Directory ===');
    console.log('Test directory:', testDir);
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    process.chdir(testDir);

    // Initialize Kanbn project
    console.log('\n=== Initializing Project ===');
    const kanbn = new Kanbn();
    await kanbn.initialise({
      name: 'Epic Test Project',
      description: 'Testing epic functionality',
      options: {
        startedColumns: ['In Progress'],
        completedColumns: ['Done']
      },
      columns: ['Backlog', 'Todo', 'In Progress', 'Done']
    });

    // Create epic task
    console.log('\n=== Creating Epic ===');
    const epicData = {
      name: 'User Authentication System',
      description: 'Implement a comprehensive user authentication system with registration, login, and password reset functionality.',
      metadata: {
        type: 'epic',
        created: new Date(),
        tags: ['epic']
      }
    };

    const epicId = await kanbn.createTask(epicData, 'Backlog');
    console.log('Created epic with ID:', epicId);

    // Initialize project context
    console.log('\n=== Initializing Project Context ===');
    const contextManager = new ProjectContext(kanbn);
    const projectContext = await contextManager.getContext(true);
    console.log('Project context initialized');

    // Initialize epic handler with correct prompt path
    console.log('\n=== Initializing Epic Handler ===');
    const promptsPath = '/app/src/prompts';
    console.log('Prompts path:', promptsPath);
    const epicHandler = new EpicHandler(kanbn, projectContext, promptsPath);
    console.log('Epic handler initialized');
    
    try {
      // Get epic task for decomposition
      console.log('\n=== Decomposing Epic ===');
      const epicTask = await kanbn.getTask(epicId);
      console.log('Epic task:', epicTask.name);

      // Decompose epic with Firecrawl if enabled
      const useFirecrawl = process.env.KANBN_USE_FIRECRAWL === 'true';
      console.log(`Using Firecrawl: ${useFirecrawl ? 'Yes' : 'No'}`);

      // Decompose epic
      console.log('Starting decomposition...');
      const results = await epicHandler.decomposeEpic(epicTask.description, null, {
        useFirecrawl
      });
      console.log('Decomposition results:', JSON.stringify(results, null, 2));

      // Create child tasks
      if (results && results.tasks && Array.isArray(results.tasks)) {
        console.log('\n=== Creating Child Tasks ===');
        console.log('Creating', results.tasks.length, 'child tasks...');

        // Find column for tasks
        const column = await kanbn.findTaskColumn(epicId);
        console.log('Target column:', column);

        for (const task of results.tasks) {
          console.log('\nCreating task:', task.name);

          // Prepare task data
          const childTaskData = {
            name: task.name,
            description: task.description || task.name,
            metadata: {
              parent: epicId,
              created: new Date(),
              tags: ['subtask']
            }
          };

          // Create task
          const childId = await kanbn.createTask(childTaskData, column);
          console.log('Created child task:', childId);

          // Update epic with child reference
          epicTask.metadata = epicTask.metadata || {};
          epicTask.metadata.children = epicTask.metadata.children || [];
          epicTask.metadata.children.push(childId);
        }

        // Update epic with children
        console.log('\nUpdating epic with children:', epicTask.metadata.children);
        await kanbn.updateTask(epicId, epicTask);
      } else {
        console.error('Invalid results format or no tasks returned:', results);
      }
    } catch (decompositionError) {
      console.error('Error during decomposition:', decompositionError);
    }

    // List final tasks
    console.log('\n=== Final Task List ===');
    const index = await kanbn.loadIndex();
    const tasks = await kanbn.loadAllTrackedTasks(index);
    console.log('Total tasks:', Object.keys(tasks).length);
    for (const [taskId, task] of Object.entries(tasks)) {
      console.log(`- ${taskId}: ${task.name} (${task.metadata?.type || 'task'})`);
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testEpicDecomposition();
