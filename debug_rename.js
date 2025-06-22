const fs = require('fs');
const path = require('path');
const kanbnFactory = require('./src/main');
const parseIndex = require('./src/parse-index');

async function debugRename() {
  // Create a temporary test directory
  const testDir = path.join(__dirname, 'test', 'real-fs-fixtures', `debug-rename-${Date.now()}`);
  
  try {
    // Create directory structure like the test fixtures
    fs.mkdirSync(testDir, { recursive: true });
    fs.mkdirSync(path.join(testDir, '.kanbn'), { recursive: true });
    fs.mkdirSync(path.join(testDir, '.kanbn', 'tasks'), { recursive: true });
    fs.mkdirSync(path.join(testDir, '.kanbn', 'archive'), { recursive: true });
    
    // Create index file
    const index = {
      name: 'Debug Test',
      description: 'Testing rename functionality',
      columns: {
        'Todo': [],
        'Doing': [],
        'Done': []
      }
    };
    
    fs.writeFileSync(
      path.join(testDir, '.kanbn', 'index.md'),
      parseIndex.json2md(index)
    );
    
    // Change to test directory
    const originalCwd = process.cwd();
    process.chdir(testDir);
    
    // Initialize kanbn
    const kanbn = kanbnFactory();
    console.log('Kanbn ROOT:', kanbn.ROOT);
    
    // Initialize with default columns
    await kanbn.initialise(['Backlog', 'Todo', 'Doing', 'Done']);
    console.log('Initialized kanbn');
    
    // Check what columns exist
    const initialIndex = await kanbn.loadIndex();
    console.log('Available columns:', Object.keys(initialIndex.columns));
    
    // Add a task to Todo column
    const firstColumn = 'Todo';
    await kanbn.createTask({ name: 'Test Task' }, firstColumn);
    console.log('Added task to column:', firstColumn);
    
    // Check initial state
    console.log('\n=== Before Rename ===');
    const indexBefore = await kanbn.loadIndex();
    console.log('Index columns:', Object.keys(indexBefore.columns));
    console.log(`${firstColumn} tasks:`, indexBefore.columns[firstColumn]);
    
    // List files in tasks directory
    const taskFiles = fs.readdirSync('.kanbn/tasks');
    console.log('Task files:', taskFiles);
    
    // Rename the task
    console.log('\n=== Renaming Task ===');
    await kanbn.renameTask('test-task', 'renamed-task');
    console.log('Rename completed');
    
    // Check state after rename
    console.log('\n=== After Rename ===');
    const indexAfter = await kanbn.loadIndex();
    console.log('Index columns:', Object.keys(indexAfter.columns));
    console.log(`${firstColumn} tasks:`, indexAfter.columns[firstColumn]);
    
    // List files in tasks directory
    const taskFilesAfter = fs.readdirSync('.kanbn/tasks');
    console.log('Task files after:', taskFilesAfter);
    
    // Check if index file exists and read it
    const indexPath = '.kanbn/index.md';
    if (fs.existsSync(indexPath)) {
      const indexContent = fs.readFileSync(indexPath, 'utf-8');
      console.log('\nIndex file content:');
      console.log(indexContent);
    } else {
      console.log('Index file does not exist!');
    }
    
    // Create fresh instance
    console.log('\n=== Fresh Instance ===');
    const freshKanbn = kanbnFactory();
    console.log('Fresh Kanbn ROOT:', freshKanbn.ROOT);
    console.log('Fresh process.cwd():', process.cwd());
    
    // Try to load index with fresh instance
    try {
      const freshIndex = await freshKanbn.loadIndex();
      console.log('Fresh index loaded successfully');
      console.log(`Fresh ${firstColumn} tasks:`, freshIndex.columns[firstColumn]);
      
      // Try to get the renamed task
      const task = await freshKanbn.getTask('renamed-task');
      console.log('Successfully retrieved renamed task:', task.name);
    } catch (error) {
      console.error('Error with fresh instance:', error.message);
      
      // Check if the task file exists
      const taskPath = '.kanbn/tasks/renamed-task.md';
      console.log('Task file exists:', fs.existsSync(taskPath));
      
      // Check if fresh instance can see the index
      const indexExists = fs.existsSync('.kanbn/index.md');
      console.log('Index file exists for fresh instance:', indexExists);
    }
    
  } catch (error) {
    console.error('Error during debug:', error);
  } finally {
    // Restore original directory
    process.chdir(originalCwd);
    
    // Clean up test directory
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
      console.log('\nCleaned up test directory');
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError.message);
    }
  }
}

debugRename().catch(console.error);