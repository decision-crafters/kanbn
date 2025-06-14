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

  test('includes core task tools', () => {
    const expected = [
      'kanbn_task_add',
      'kanbn_task_view',
      'kanbn_task_list',
      'kanbn_task_update',
      'kanbn_task_move',
      'kanbn_task_delete'
    ];
    expected.forEach(name => {
      expect(tools).toHaveProperty(name);
    });

    // should include every CLI command as a tool (23 total)
    expect(Object.keys(tools).length).toBe(23);
  });
});
