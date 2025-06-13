const { tools } = require('..');

describe('@kanbn/mcp-tool', () => {
  test('exports at least one tool definition', () => {
    const keys = Object.keys(tools);
    expect(keys.length).toBeGreaterThan(0);
    
    const sample = tools[keys[0]];
    expect(typeof sample.name).toBe('string');
    expect(typeof sample.inputSchema).toBe('object');
    expect(typeof sample.outputSchema).toBe('object');
  });

  test('all tools have required properties', () => {
    const toolKeys = Object.keys(tools);
    
    toolKeys.forEach(key => {
      const tool = tools[key];
      expect(tool).toHaveProperty('name');
      expect(tool).toHaveProperty('inputSchema');
      expect(tool).toHaveProperty('outputSchema');
      expect(typeof tool.name).toBe('string');
      expect(typeof tool.inputSchema).toBe('object');
      expect(typeof tool.outputSchema).toBe('object');
    });
  });

  test('kanbn_task_add tool exists and has correct structure', () => {
    expect(tools).toHaveProperty('kanbn_task_add');
    
    const taskAddTool = tools.kanbn_task_add;
    expect(taskAddTool.name).toBe('kanbn_task_add');
    expect(taskAddTool.description).toBe('Add a task to the Kanbn board');
    
    // Verify input schema structure
    expect(taskAddTool.inputSchema.type).toBe('object');
    expect(taskAddTool.inputSchema.properties).toHaveProperty('name');
    expect(taskAddTool.inputSchema.required).toContain('name');
    
    // Verify output schema structure
    expect(taskAddTool.outputSchema.type).toBe('object');
    expect(taskAddTool.outputSchema.properties).toHaveProperty('taskId');
    expect(taskAddTool.outputSchema.required).toContain('taskId');
  });
});
