const fs = require('fs');
const path = require('path');
const Kanbn = require('../../src/main');

describe('Simple createTask tests', () => {
  let kanbn;
  
  beforeEach(() => {
    kanbn = Kanbn();
  });
  
  test('Kanbn is a function', () => {
    expect(typeof Kanbn).toBe('function');
  });
  
  test('kanbn has initialise method', () => {
    expect(typeof kanbn.initialise).toBe('function');
  });
  
  test('kanbn has createTask method', () => {
    expect(typeof kanbn.createTask).toBe('function');
  });
});