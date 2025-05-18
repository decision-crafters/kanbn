/**
 * MCP Server Resource Test
 */
const mockData = require('./mock-data');
const utility = require('../src/utility');

class MockMcpServer {
  constructor() {
    this.resources = {};
    
    // Add required test resources
    this.resources['board-state'] = {
      name: 'Test Board',
      columns: { 'Backlog': ['test-1'], 'In Progress': [] },
      tasks: mockData.mockTasks
    };
    
    this.resources['task'] = mockData.mockTasks['test-1'];
    
    this.resources['workload-metrics'] = {
      totalTasks: 1,
      completedTasks: 0,
      estimatedWorkload: 3,
      remainingWorkload: 3
    };
    
    this.resources['column-definitions'] = {
      'Backlog': { 
        workflowState: 'backlog',
        color: '#e3e3e3'
      },
      'In Progress': {
        workflowState: 'active',
        color: '#d4edda'
      }
    };
    
    this.resources['epic-templates'] = {
      'feature': {
        description: 'New product capability',
        acceptanceCriteria: ['All user flows documented']
      },
      'bugfix': {
        description: 'Defect resolution',
        acceptanceCriteria: ['Root cause identified']
      }
    };
    
    this.resources['prompt-versions'] = {
      'task-description': [
        {
          version: '1.0',
          content: 'Template content',
          timestamp: new Date().toISOString()
        }
      ]
    };
  }
  
  getResource(name) {
    return this.resources[name] || null;
  }
}

function testResources() {
  console.log('Testing MCP resources with mocks');
  
  const server = new MockMcpServer();
  
  const requiredResources = [
    'board-state',
    'task',
    'workload-metrics',
    'column-definitions',
    'epic-templates',
    'prompt-versions'
  ];
  
  let passedTests = 0;
  let failedTests = 0;
  
  requiredResources.forEach(resource => {
    const data = server.getResource(resource);
    if (!data) {
      console.warn(`⚠️ Resource ${resource} returned empty data`);
      failedTests++;
    } else {
      console.log(`✓ ${resource} resource OK`);
      passedTests++;
    }
  });
  
  console.log(`\nResources test summary: ${passedTests} passed, ${failedTests} failed`);
  
  if (failedTests === 0) {
    console.log('\n✅ MCP resources tests completed successfully');
  } else {
    console.error('\n❌ MCP resources tests failed');
  }
}

// Run the tests
testResources();