const utility = require('../../src/utility');

describe('utility.js', () => {
  describe('paramCase()', () => {
    test('should convert PascalCase to param-case', () => {
      expect(utility.paramCase('PascalCase')).toBe('pascal-case');
    });

    test('should convert strings with spaces to param-case', () => {
      expect(utility.paramCase('Test Word')).toBe('test-word');
    });

    test('should handle multiple spaces between words', () => {
      expect(utility.paramCase('Test  Multiple   Spaces')).toBe('test-multiple-spaces');
    });

    test('should convert strings with various special characters to param-case', () => {
      expect(utility.paramCase('Test!@#Characters')).toBe('test-characters');
    });

    test('should handle leading and trailing special characters/spaces', () => {
      expect(utility.paramCase('  !Test@Word!  ')).toBe('test-word');
    });

    test('should handle all uppercase words', () => {
      expect(utility.paramCase('ALLUPPERCASE')).toBe('alluppercase');
    });

    test('should handle acronyms like HVACSystem', () => {
      expect(utility.paramCase('HVACSystem')).toBe('hvac-system');
    });

    test('should return an empty string if input is empty', () => {
      expect(utility.paramCase('')).toBe('');
    });

    test('should handle single character strings', () => {
      expect(utility.paramCase('A')).toBe('a');
      expect(utility.paramCase('a')).toBe('a');
    });

    test('should handle strings that are already param-case', () => {
      expect(utility.paramCase('already-param-case')).toBe('already-param-case');
    });
  });

  describe('getTaskId()', () => {
    test('should generate task ID from simple name', () => {
      expect(utility.getTaskId('My Task Name')).toBe('my-task-name');
    });

    test('should handle names needing param-case conversion', () => {
      expect(utility.getTaskId('AnotherTask With !!Symbols')).toBe('another-task-with-symbols');
    });

    test('should handle empty input', () => {
      expect(utility.getTaskId('')).toBe('');
    });

    test('should handle names similar to paramCase edge cases', () => {
      expect(utility.getTaskId('HVACSystem')).toBe('hvac-system');
    });
  });

  describe('strArg()', () => {
    test('should return string input as is', () => {
      expect(utility.strArg('hello')).toBe('hello');
    });

    test('should return last element for array input by default (all = false)', () => {
      // Note: .pop() modifies the original array, so pass a copy
      expect(utility.strArg(['a', 'b', 'c'])).toBe('c');
    });

    test('should return joined string for array input when all = true', () => {
      expect(utility.strArg(['a', 'b', 'c'], true)).toBe('a,b,c');
    });

    test('should return empty string for empty array input', () => {
      expect(utility.strArg([], false)).toBe('');
      expect(utility.strArg([], true)).toBe('');
    });

    test('should handle single element array correctly', () => {
      expect(utility.strArg(['a'])).toBe('a');
      expect(utility.strArg(['a'], true)).toBe('a');
    });

    test('should return non-string/array inputs as is', () => {
      expect(utility.strArg(123)).toBe(123);
      expect(utility.strArg(null)).toBeNull();
      expect(utility.strArg(undefined)).toBeUndefined();
      const obj = { key: 'value' };
      expect(utility.strArg(obj)).toBe(obj);
    });

    // Important: Test that the original array is modified when all = false
    test('should modify the original array when all = false (due to pop)', () => {
      const originalArray = ['x', 'y', 'z'];
      const result = utility.strArg(originalArray);
      expect(result).toBe('z');
      expect(originalArray).toEqual(['x', 'y']); // Check original array was modified
    });

    // Test that the original array is NOT modified when all = true
    test('should not modify the original array when all = true (due to join)', () => {
      const originalArray = ['x', 'y', 'z'];
      const result = utility.strArg(originalArray, true);
      expect(result).toBe('x,y,z');
      expect(originalArray).toEqual(['x', 'y', 'z']); // Check original array was NOT modified
    });
  });

  describe('arrayArg()', () => {
    test('should return array input as is', () => {
      const input = ['a', 'b'];
      expect(utility.arrayArg(input)).toBe(input);
    });

    test('should wrap string input in an array', () => {
      expect(utility.arrayArg('hello')).toEqual(['hello']);
    });

    test('should wrap non-string/array inputs in an array', () => {
      expect(utility.arrayArg(123)).toEqual([123]);
      expect(utility.arrayArg(null)).toEqual([null]);
      expect(utility.arrayArg(undefined)).toEqual([undefined]);
      const obj = { key: 'value' };
      expect(utility.arrayArg(obj)).toEqual([obj]);
    });

    test('should return empty array for empty array input', () => {
      expect(utility.arrayArg([])).toEqual([]);
    });
  });

  describe('trimLeftEscapeCharacters()', () => {
    test('should remove leading backslashes', () => {
      expect(utility.trimLeftEscapeCharacters('\\task')).toBe('task');
    });

    test('should remove leading forward slashes', () => {
      expect(utility.trimLeftEscapeCharacters('//task')).toBe('task');
    });

    test('should remove mixed leading slashes', () => {
      expect(utility.trimLeftEscapeCharacters('/\\/task')).toBe('task');
    });

    test('should not remove slashes in the middle or end', () => {
      expect(utility.trimLeftEscapeCharacters('task/name\\part')).toBe('task/name\\part');
    });

    test('should return empty string if input is empty', () => {
      expect(utility.trimLeftEscapeCharacters('')).toBe('');
    });

    test('should return the string if no leading slashes', () => {
      expect(utility.trimLeftEscapeCharacters('task')).toBe('task');
    });
  });

  describe('compareDates()', () => {
    test('should return true for dates on the same day', () => {
      const date1 = new Date(2024, 4, 7, 10, 30, 0); // May 7th 2024, 10:30
      const date2 = new Date(2024, 4, 7, 18, 0, 0); // May 7th 2024, 18:00
      expect(utility.compareDates(date1, date2)).toBe(true);
    });

    test('should return false for dates on different days', () => {
      const date1 = new Date(2024, 4, 7); // May 7th 2024
      const date2 = new Date(2024, 4, 8); // May 8th 2024
      expect(utility.compareDates(date1, date2)).toBe(false);
    });

    test('should return false for dates in different months/years', () => {
      const date1 = new Date(2024, 4, 7);
      const date2 = new Date(2024, 5, 7);
      const date3 = new Date(2025, 4, 7);
      expect(utility.compareDates(date1, date2)).toBe(false);
      expect(utility.compareDates(date1, date3)).toBe(false);
    });

    test('should handle string date inputs', () => {
      expect(utility.compareDates('2024-05-07T10:00:00', '2024-05-07T20:00:00')).toBe(true);
      expect(utility.compareDates('2024-05-07', '2024-05-08')).toBe(false);
    });

    test('should handle timestamp inputs', () => {
      const ts1 = new Date(2024, 4, 7, 11, 0, 0).getTime();
      const ts2 = new Date(2024, 4, 7, 12, 0, 0).getTime();
      const ts3 = new Date(2024, 4, 8, 11, 0, 0).getTime();
      expect(utility.compareDates(ts1, ts2)).toBe(true);
      expect(utility.compareDates(ts1, ts3)).toBe(false);
    });
  });

  describe('coerceUndefined()', () => {
    test('should return 0 for undefined input with default type', () => {
      expect(utility.coerceUndefined(undefined)).toBe(0);
    });

    test('should return empty string for undefined input with type string', () => {
      expect(utility.coerceUndefined(undefined, 'string')).toBe('');
    });

    test('should return original value if not undefined', () => {
      expect(utility.coerceUndefined(10)).toBe(10);
      expect(utility.coerceUndefined('hello')).toBe('hello');
      expect(utility.coerceUndefined(null)).toBe(null);
      expect(utility.coerceUndefined(0)).toBe(0);
      expect(utility.coerceUndefined('')).toBe('');
    });
  });

  describe('bold() / dim()', () => {
    test('bold() should wrap string with bold ANSI codes', () => {
      expect(utility.bold('test')).toBe('\x1b[1mtest\x1b[0m');
    });

    test('dim() should wrap string with dim ANSI codes', () => {
      expect(utility.dim('test')).toBe('\x1b[2mtest\x1b[0m');
    });
  });

  describe('replaceTags()', () => {
    test('should replace {b} tags with bold text', () => {
      expect(utility.replaceTags('This is {b}bold{b} text'))
        .toBe(`This is ${utility.bold('bold')} text`);
    });

    test('should replace {d} tags with dim text', () => {
      expect(utility.replaceTags('This is {d}dim{d} text'))
        .toBe(`This is ${utility.dim('dim')} text`);
    });

    test('should handle multiple tags', () => {
      expect(utility.replaceTags('{b}Bold{b} and {d}dim{d}'))
        .toBe(`${utility.bold('Bold')} and ${utility.dim('dim')}`);
    });

    test('should process nested tags independently', () => {
      // The implementation processes each tag type independently
      // So nested tags will be processed in sequence, not nested
      const input = '{b}A{d}B{d}C{b}';
      // First processes dim tags, then bold tags
      const dimmed = input.replace(/{d}B{d}/, utility.dim('B'));
      const expected = dimmed.replace(/{b}A.*C{b}/, utility.bold('A' + utility.dim('B') + 'C'));
      expect(utility.replaceTags(input)).toBe(expected);
    });

    test('should not replace incomplete or incorrect tags', () => {
      expect(utility.replaceTags('Text {b}bold text')).toBe('Text {b}bold text');
      expect(utility.replaceTags('Text bold{b} text')).toBe('Text bold{b} text');
      expect(utility.replaceTags('Text {x}bold{x} text')).toBe('Text {x}bold{x} text');
    });
  });

  describe('zip()', () => {
    test('should zip two arrays of equal length', () => {
      const a = [1, 2, 3];
      const b = ['a', 'b', 'c'];
      expect(utility.zip(a, b)).toEqual([[1, 'a'], [2, 'b'], [3, 'c']]);
    });

    test('should zip arrays where second is shorter (extra elements paired with undefined)', () => {
      const a = [1, 2, 3];
      const b = ['a', 'b'];
      expect(utility.zip(a, b)).toEqual([[1, 'a'], [2, 'b'], [3, undefined]]);
    });

    test('should zip arrays where first is shorter (extra elements in second ignored)', () => {
      const a = [1, 2];
      const b = ['a', 'b', 'c'];
      expect(utility.zip(a, b)).toEqual([[1, 'a'], [2, 'b']]);
    });

    test('should handle empty arrays', () => {
      expect(utility.zip([], [])).toEqual([]);
      expect(utility.zip([1, 2], [])).toEqual([[1, undefined], [2, undefined]]);
      expect(utility.zip([], ['a', 'b'])).toEqual([]);
    });
  });

});
