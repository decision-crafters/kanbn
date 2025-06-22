const kanbnFactory = require('./src/main');
const path = require('path');
const fs = require('fs');

async function debugTaskCreation() {
  try {
    console.log('Setting up fixtures...');
    const originalCwd = process.cwd();
    const fixtures = require('./test/fixtures')({
      countColumns: 4,
      countTasks: 5,
      options: {
        startedColumns: ['Column 2'],
        completedColumns: ['Column 4']
      }
    });
    
    console.log('Test directory:', fixtures.testPath);
    process.chdir(fixtures.testPath);
    
    console.log('Current working directory:', process.cwd());
    console.log('.kanbn exists:', fs.existsSync('.kanbn'));
    console.log('index.md exists:', fs.existsSync('.kanbn/index.md'));
    console.log('tasks folder exists:', fs.existsSync('.kanbn/tasks'));
    
    if (fs.existsSync('.kanbn/tasks')) {
      const taskFiles = fs.readdirSync('.kanbn/tasks');
      console.log('Existing task files:', taskFiles);
    }
    
    console.log('Creating kanbn instance...');
    const kanbn = kanbnFactory();
    
    console.log('Creating "Started task" in Column 2...');
    const taskId = await kanbn.createTask({ name: 'Started task' }, 'Column 2');
    console.log('Created task with ID:', taskId);
    
    console.log('Attempting to get the task...');
    const task = await kanbn.getTask(taskId);
    console.log('Retrieved task:', task.name);
    
    process.chdir(originalCwd);
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Error during test:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

debugTaskCreation();