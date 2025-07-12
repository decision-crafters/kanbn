// Test file to verify Jest custom matchers work correctly
require('./jest-helpers');

describe('Jest Custom Matchers', () => {
  describe('toThrowAsync', () => {
    test('should pass when async function throws', async () => {
      const asyncThrowingFunction = async () => {
        throw new Error('Test error');
      };
      
      await expect(asyncThrowingFunction).toThrowAsync();
    });
    
    test('should pass when async function throws with expected message', async () => {
      const asyncThrowingFunction = async () => {
        throw new Error('Specific error message');
      };
      
      await expect(asyncThrowingFunction).toThrowAsync('Specific error');
    });
    
    test('should pass when async function throws with regex match', async () => {
      const asyncThrowingFunction = async () => {
        throw new Error('Error: Something went wrong');
      };
      
      await expect(asyncThrowingFunction).toThrowAsync(/Something went wrong/);
    });
    
    test('should fail when async function does not throw', async () => {
      const asyncNonThrowingFunction = async () => {
        return 'success';
      };
      
      try {
        await expect(asyncNonThrowingFunction).toThrowAsync();
        fail('Expected assertion to fail');
      } catch (error) {
        expect(error.message).toContain('expected function to throw an error');
      }
    });
  });
  
  describe('toContain for arrays', () => {
    test('should pass when array contains exact string', () => {
      const array = ['apple', 'banana', 'cherry'];
      expect(array).toContain('banana');
    });
    
    test('should pass when array contains string with substring', () => {
      const array = ['apple pie', 'banana bread', 'cherry tart'];
      expect(array).toContain('banana');
    });
    
    test('should pass when array contains string matching regex', () => {
      const array = ['task-123', 'item-456', 'note-789'];
      expect(array).toContain(/task-\d+/);
    });
    
    test('should fail when array does not contain value', () => {
      const array = ['apple', 'banana', 'cherry'];
      
      try {
        expect(array).toContain('orange');
        fail('Expected assertion to fail');
      } catch (error) {
        expect(error.message).toContain('expected');
        expect(error.message).toContain('to contain');
      }
    });
  });
  
  describe('toContain for strings', () => {
    test('should pass when string contains substring', () => {
      const text = 'Hello world';
      expect(text).toContain('world');
    });
    
    test('should pass when string matches regex', () => {
      const text = 'Error: File not found';
      expect(text).toContain(/Error:.*not found/);
    });
    
    test('should fail when string does not contain substring', () => {
      const text = 'Hello world';
      
      try {
        expect(text).toContain('goodbye');
        fail('Expected assertion to fail');
      } catch (error) {
        expect(error.message).toContain('expected');
        expect(error.message).toContain('to contain');
      }
    });
  });
  
  describe('toContainMatch', () => {
    test('should pass when array contains matching string', () => {
      const array = ['apple', 'banana', 'cherry'];
      expect(array).toContainMatch('ban');
    });
    
    test('should pass when array contains regex match', () => {
      const array = ['task-123', 'item-456', 'note-789'];
      expect(array).toContainMatch(/task-\d+/);
    });
    
    test('should fail when array does not contain match', () => {
      const array = ['apple', 'banana', 'cherry'];
      
      try {
        expect(array).toContainMatch('orange');
        fail('Expected assertion to fail');
      } catch (error) {
        expect(error.message).toContain('expected');
        expect(error.message).toContain('to contain match');
      }
    });
  });
  
  describe('toRejectWith', () => {
    test('should pass when promise rejects with expected message', async () => {
      const rejectingPromise = Promise.reject(new Error('Test error'));
      
      await expect(rejectingPromise).toRejectWith('Test error');
    });
    
    test('should pass when promise rejects with regex match', async () => {
      const rejectingPromise = Promise.reject(new Error('Network timeout error'));
      
      await expect(rejectingPromise).toRejectWith(/timeout/);
    });
    
    test('should fail when promise resolves', async () => {
      const resolvingPromise = Promise.resolve('success');
      
      try {
        await expect(resolvingPromise).toRejectWith('error');
        fail('Expected assertion to fail');
      } catch (error) {
        expect(error.message).toContain('expected promise to reject');
      }
    });
    
    test('should fail when promise rejects with different message', async () => {
      const rejectingPromise = Promise.reject(new Error('Different error'));
      
      try {
        await expect(rejectingPromise).toRejectWith('Expected error');
        fail('Expected assertion to fail');
      } catch (error) {
        expect(error.message).toContain('expected promise to reject with');
      }
    });
  });
});