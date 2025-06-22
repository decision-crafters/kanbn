const { createFixtures, cleanupFixtures } = require('./test/real-fs-fixtures.js');
const kanbn = require('./src/main.js');

async function test() {
  const options = {
    tasks: [
      {
        name: 'Task 3',
        metadata: {
          tags: ['Large'],
          created: new Date('16 December 1999 00:00:00 GMT'),
          started: new Date('16 December 1999 01:00:00 GMT'),
          completed: new Date('17 December 1999 00:00:00 GMT')
        }
      }
    ],
    columns: {
      'Column 3': ['task-3']
    },
    noRandom: true
  };
  
  const result = createFixtures('debug-test', options);
  const originalCwd = process.cwd();
  process.chdir(result.testDir);
  
  try {
    const kanbnInstance = new kanbn();
    const index = await kanbnInstance.loadIndex();
    console.log('Index columns:', JSON.stringify(index.columns, null, 2));
  } catch (error) {
    console.error('Error loading index:', error.message);
  } finally {
    process.chdir(originalCwd);
    cleanupFixtures(result.testDir);
  }
}

test().catch(console.error);