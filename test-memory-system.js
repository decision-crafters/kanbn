/**
 * Test script for the enhanced memory system
 * 
 * This script creates a test memory manager, adds some task references,
 * and verifies that they are properly saved and retrieved.
 */

const path = require('path');
const fs = require('fs');
const MemoryManager = require('./src/lib/memory-manager');

// Create a test directory
const testDir = path.join(__dirname, 'test-memory');
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true });
}

// Create a fresh .kanbn directory inside the test directory
const kanbnDir = path.join(testDir, '.kanbn');
if (fs.existsSync(kanbnDir)) {
  fs.rmSync(kanbnDir, { recursive: true, force: true });
}
fs.mkdirSync(kanbnDir, { recursive: true });

// Run the memory system test
async function testMemorySystem() {
  console.log('Starting memory system test...');
  console.log(`Test directory: ${testDir}`);
  console.log(`Kanbn directory: ${kanbnDir}`);

  try {
    // Create a memory manager
    const memoryManager = new MemoryManager(testDir);
    await memoryManager.loadMemory();
    
    console.log(`Memory file path: ${memoryManager.memoryFile}`);
    
    // Add some task references
    const taskIds = ['task-1', 'task-2', 'task-3'];
    for (const taskId of taskIds) {
      console.log(`Adding reference for task ${taskId}...`);
      await memoryManager.addTaskReference(taskId, {
        taskId,
        taskName: `Test Task ${taskId}`,
        column: 'Backlog'
      }, 'view');
    }
    
    // Verify that task references were saved
    const savedMemoryManager = new MemoryManager(testDir);
    await savedMemoryManager.loadMemory();
    
    console.log('Task references in memory:');
    for (const taskId in savedMemoryManager.memory.taskReferences) {
      const taskRef = savedMemoryManager.memory.taskReferences[taskId];
      console.log(`- ${taskId}: ${taskRef.data.taskName}, ${taskRef.references.length} references`);
    }
    
    // Check if file exists on disk
    if (fs.existsSync(savedMemoryManager.memoryFile)) {
      console.log(`Memory file exists at: ${savedMemoryManager.memoryFile}`);
      const fileContents = fs.readFileSync(savedMemoryManager.memoryFile, 'utf8');
      console.log(`Memory file contents: ${fileContents.substring(0, 100)}...`);
    } else {
      console.log(`Memory file does not exist at: ${savedMemoryManager.memoryFile}`);
    }
    
    console.log('Memory system test completed successfully!');
  } catch (error) {
    console.error('Error during memory system test:', error);
  }
}

// Run the test
testMemorySystem();
