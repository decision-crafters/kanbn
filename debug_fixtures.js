const { createFixtures } = require('./test/real-fs-fixtures.js');
const utility = require('./src/utility.js');

const options = {
  tasks: [
    {
      name: 'Task 1',
      metadata: {
        tags: ['Small'],
        created: new Date('15 December 1999 00:00:00 GMT'),
        due: new Date('16 December 1999 00:00:00 GMT')
      }
    },
    {
      name: 'Task 2',
      metadata: {
        tags: ['Medium'],
        created: new Date('10 December 1999 00:00:00 GMT'),
        completed: new Date('11 December 1999 00:00:00 GMT')
      }
    },
    {
      name: 'Task 3',
      metadata: {
        tags: ['Large'],
        created: new Date('16 December 1999 00:00:00 GMT'),
        started: new Date('16 December 1999 01:00:00 GMT'),
        completed: new Date('17 December 1999 00:00:00 GMT')
      }
    },
    {
      name: 'Task 4',
      metadata: {
        tags: ['Huge'],
        created: new Date('18 December 1999 00:00:00 GMT'),
        due: new Date('19 December 1999 00:00:00 GMT')
      }
    }
  ],
  columns: {
    'Column 1': [
      'task-1'
    ],
    'Column 2': [
      'task-2'
    ],
    'Column 3': [
      'task-3',
      'task-4'
    ]
  },
  noRandom: true
};

console.log('Creating fixtures with options:', JSON.stringify(options, null, 2));
const result = createFixtures('debug-test', options);
console.log('Generated index:', JSON.stringify(result.index, null, 2));

// Clean up
const { cleanupFixtures } = require('./test/real-fs-fixtures.js');
cleanupFixtures(result.testDir);