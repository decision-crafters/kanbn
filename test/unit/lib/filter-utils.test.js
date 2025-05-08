const filterUtils = require('../../../src/lib/filter-utils');

describe('filter-utils.js', () => {
  describe('stringFilter()', () => {
    test('should return true for a direct match', () => {
      expect(filterUtils.stringFilter('test', 'this is a test string')).toBe(true);
    });

    test('should return false if filter string is not found', () => {
      expect(filterUtils.stringFilter('nomatch', 'this is a test string')).toBe(false);
    });

    test('should be case-sensitive', () => {
      expect(filterUtils.stringFilter('Test', 'this is a test string')).toBe(false);
    });

    test('should return true if input matches any element in filter array', () => {
      expect(filterUtils.stringFilter(['one', 'test', 'three'], 'this is a test string')).toBe(true);
    });

    test('should return false if input matches no elements in filter array', () => {
      expect(filterUtils.stringFilter(['one', 'two', 'three'], 'this is a test string')).toBe(false);
    });

    test('should return true if filter is empty string (as indexOf(\'\') is 0)', () => {
      expect(filterUtils.stringFilter('', 'this is a test string')).toBe(true);
    });

    test('should handle empty filter array (returns false as .some() on empty is false)', () => {
      expect(filterUtils.stringFilter([], 'this is a test string')).toBe(false);
    });

    test('should return false if input string is empty and filter is not', () => {
      expect(filterUtils.stringFilter('test', '')).toBe(false);
      expect(filterUtils.stringFilter(['test'], '')).toBe(false);
    });

    test('should return true if input string is empty and filter is empty string', () => {
      expect(filterUtils.stringFilter('', '')).toBe(true);
    });

    test('should handle non-string inputs gracefully (coerced to string for indexOf)', () => {
      // Note: Javascript's indexOf coerces the searched string
      expect(filterUtils.stringFilter('123', 'abc123def')).toBe(true);
      expect(filterUtils.stringFilter('null', 'a null value')).toBe(true);
      // Depending on strictness, you might want type checks, but current implementation relies on coercion
    });
  });

  describe('dateFilter()', () => {
    const dateInput = new Date(2024, 4, 15); // May 15th 2024
    const sameDateFilter = new Date(2024, 4, 15); // May 15th 2024
    const differentDateFilter = new Date(2024, 4, 16); // May 16th 2024
    const earlierDateFilter = new Date(2024, 4, 10); // May 10th 2024
    const laterDateFilter = new Date(2024, 4, 20); // May 20th 2024

    test('should return true if input date matches single filter date', () => {
      expect(filterUtils.dateFilter(sameDateFilter, dateInput)).toBe(true);
    });

    test('should return false if input date does not match single filter date', () => {
      expect(filterUtils.dateFilter(differentDateFilter, dateInput)).toBe(false);
    });

    test('should return true if input date is between earliest and latest filter dates in array', () => {
      expect(filterUtils.dateFilter([earlierDateFilter, laterDateFilter], dateInput)).toBe(true);
      expect(filterUtils.dateFilter([laterDateFilter, earlierDateFilter], dateInput)).toBe(true); // Order shouldn't matter
    });

    test('should return true if input date matches boundary dates in filter array', () => {
      expect(filterUtils.dateFilter([earlierDateFilter, dateInput], dateInput)).toBe(true);
      expect(filterUtils.dateFilter([dateInput, laterDateFilter], dateInput)).toBe(true);
    });

    test('should return false if input date is outside range of filter dates in array', () => {
      expect(filterUtils.dateFilter([earlierDateFilter, differentDateFilter], laterDateFilter)).toBe(false);
      expect(filterUtils.dateFilter([differentDateFilter, laterDateFilter], earlierDateFilter)).toBe(false);
    });

    test('should handle single date in array as exact match', () => {
      // Note: Current logic treats a single-element array as a range between min/max (which is just the element itself)
      // This differs slightly from the documented exact match logic for single dates, but utility.compareDates handles it.
      expect(filterUtils.dateFilter([sameDateFilter], dateInput)).toBe(true);
      expect(filterUtils.dateFilter([differentDateFilter], dateInput)).toBe(false);
    });

    test('should handle Date objects with different times correctly (uses utility.compareDates)', () => {
      const dateInputTime = new Date(2024, 4, 15, 10, 0, 0);
      const sameDateFilterTime = new Date(2024, 4, 15, 18, 0, 0);
      expect(filterUtils.dateFilter(sameDateFilterTime, dateInputTime)).toBe(true);
    });

    // Consider adding tests for invalid date inputs or filters if necessary, though current code might rely on valid Date objects.
  });

  describe('numberFilter()', () => {
    test('should return true if input matches single filter number', () => {
      expect(filterUtils.numberFilter(5, 5)).toBe(true);
    });

    test('should return false if input does not match single filter number', () => {
      expect(filterUtils.numberFilter(5, 6)).toBe(false);
    });

    test('should return true if input is between min and max filter numbers in array', () => {
      expect(filterUtils.numberFilter([3, 7], 5)).toBe(true);
      expect(filterUtils.numberFilter([7, 3], 5)).toBe(true); // Order shouldn't matter
    });

    test('should return true if input matches boundary numbers in filter array', () => {
      expect(filterUtils.numberFilter([3, 5], 5)).toBe(true);
      expect(filterUtils.numberFilter([5, 7], 5)).toBe(true);
    });

    test('should return false if input is outside range of filter numbers in array', () => {
      expect(filterUtils.numberFilter([3, 7], 2)).toBe(false);
      expect(filterUtils.numberFilter([3, 7], 8)).toBe(false);
    });

    test('should handle single number in array as exact match range', () => {
      expect(filterUtils.numberFilter([5], 5)).toBe(true);
      expect(filterUtils.numberFilter([5], 6)).toBe(false);
    });

    test('should handle negative numbers', () => {
      expect(filterUtils.numberFilter([-5, -1], -3)).toBe(true);
      expect(filterUtils.numberFilter([-5], -5)).toBe(true);
      expect(filterUtils.numberFilter([-5, 5], 0)).toBe(true);
    });

    test('should handle floating point numbers', () => {
      expect(filterUtils.numberFilter(3.14, 3.14)).toBe(true);
      expect(filterUtils.numberFilter([1.1, 2.2], 1.5)).toBe(true);
      expect(filterUtils.numberFilter([1.1, 2.2], 2.3)).toBe(false);
    });

    // Consider tests for non-numeric inputs if necessary, though current code assumes numeric inputs.
  });
});
