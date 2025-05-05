const fs = require('fs');
const path = require('path');
const { Kanbn } = require('./src/main');
const ProjectContext = require('./src/lib/project-context');
const EpicHandler = require('./src/lib/epic-handler');

/**
 * Runs an end-to-end test that initializes a Kanbn project, creates an epic task linked to a repository, decomposes the epic into subtasks using AI-driven analysis, and prints detailed information about all resulting tasks.
 *
 * The test sets up a temporary project environment, configures AI service usage based on environment variables, and leverages repository analysis (optionally using Firecrawl) to generate subtasks from the epic's description. Each generated subtask is created in the same column as the epic and linked as a child. The epic is updated to reference its children, and all tasks are listed with their details at the end.
 *
 * @remark Errors during project setup or decomposition are caught and logged; the function does not throw.
 */
async function testRepoEpicDecomposition() {
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

    // Create test directory
    const testDir = '/tmp/kanbn-epic-repo-test';
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
      name: 'Presenter Enhancement Project',
      description: 'Adding new features to the Presenter project',
      options: {
        startedColumns: ['In Progress'],
        completedColumns: ['Done']
      },
      columns: ['Backlog', 'Todo', 'In Progress', 'Done']
    });

    // Create epic task
    console.log('\n=== Creating Epic ===');
    const epicData = {
      name: 'Enhance Presenter CLI Tool',
      description: 'Add new features to the Presenter CLI tool (https://github.com/tosin2013/presenter.git) to improve its functionality and user experience. Consider adding features like presentation templates, export options, and better documentation.',
      metadata: {
        type: 'epic',
        created: new Date(),
        tags: ['epic', 'enhancement'],
        repository: 'https://github.com/tosin2013/presenter.git'
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

      // Enable Firecrawl for repository analysis
      const useFirecrawl = process.env.KANBN_USE_FIRECRAWL === 'true';
      console.log(`Using Firecrawl: ${useFirecrawl ? 'Yes' : 'No'}`);

      // Decompose epic
      console.log('Starting decomposition...');
      const results = await epicHandler.decomposeEpic(epicTask.description, null, {
        useFirecrawl,
        repository: epicTask.metadata.repository
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
              tags: task.metadata?.tags || ['subtask'],
              sprintSuggestion: task.sprintSuggestion,
              estimatedWorkload: task.estimatedWorkload
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

      // List final tasks with details
      console.log('\n=== Final Task List with Details ===');
      const index = await kanbn.loadIndex();
      const tasks = await kanbn.loadAllTrackedTasks(index);
      console.log('Total tasks:', Object.keys(tasks).length);
      for (const [taskId, task] of Object.entries(tasks)) {
        console.log(`\n=== Task: ${taskId} ===`);
        console.log('Name:', task.name);
        console.log('Type:', task.metadata?.type || 'task');
        console.log('Description:', task.description);
        console.log('Tags:', task.metadata?.tags?.join(', ') || 'none');
        if (task.metadata?.references) {
          console.log('References:');
          for (const [type, refs] of Object.entries(task.metadata.references)) {
            console.log(`  ${type}:`);
            for (const ref of refs) {
              console.log(`    - ${ref.title || ref.url}`);
              console.log(`      ${ref.url}`);
            }
          }
        }
      }

    } catch (decompositionError) {
      console.error('Error during decomposition:', decompositionError);
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testRepoEpicDecomposition();
