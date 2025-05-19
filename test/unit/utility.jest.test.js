/**
 * Jest tests for utility functions
 */

const utility = require('../../src/utility');

describe('Utility Functions', () => {
  describe('paramCase()', () => {
    test('should convert strings to param-case', () => {
      expect(utility.paramCase('PascalCase')).toBe('pascal-case');
      expect(utility.paramCase('camelCase')).toBe('camel-case');
      expect(utility.paramCase('snake_case')).toBe('snake-case');
      expect(utility.paramCase('No Case')).toBe('no-case');
      expect(utility.paramCase('With 2 numbers 3')).toBe('with-2-numbers-3');
      expect(utility.paramCase('Multiple  spaces')).toBe('multiple-spaces');
      expect(utility.paramCase('Tab\tCharacter')).toBe('tab-character');
      expect(utility.paramCase('New\nLine')).toBe('new-line');
      expect(utility.paramCase('Punctuation, Characters')).toBe('punctuation-characters');
      expect(
        utility.paramCase('M!o?r.e, @p:u;n|c\\t/u"a\'t`i£o$n% ^c&h*a{r}a[c]t(e)r<s> ~l#i+k-e= _t¬hese')
      ).toBe('m-o-r-e-p-u-n-c-t-u-a-t-i-o-n-c-h-a-r-a-c-t-e-r-s-l-i-k-e-t-hese');
      expect(utility.paramCase('This string ends with punctuation!')).toBe('this-string-ends-with-punctuation');
      expect(utility.paramCase('?This string starts with punctuation')).toBe('this-string-starts-with-punctuation');
      expect(
        utility.paramCase('#This string has punctuation at both ends&')
      ).toBe('this-string-has-punctuation-at-both-ends');
      expect(utility.paramCase('軟件 測試')).toBe('軟件-測試');
      expect(utility.paramCase('実験 試し')).toBe('実験-試し');
      expect(utility.paramCase('יקספּערמענאַל פּרובירן')).toBe('יקספּערמענאַל-פּרובירן');
      expect(utility.paramCase('я надеюсь, что это сработает')).toBe('я-надеюсь-что-это-сработает');
    });
  });

  describe('strArg()', () => {
    test('should convert arguments into strings', () => {
      expect(utility.strArg('test')).toBe('test');
      expect(utility.strArg(['test'])).toBe('test');
      expect(utility.strArg(['test1', 'test2'])).toBe('test2');
      expect(utility.strArg(['test1', 'test2'], true)).toBe('test1,test2');
    });
  });

  describe('arrayArg()', () => {
    test('should convert arguments into arrays', () => {
      expect(utility.arrayArg('test')).toEqual(['test']);
      expect(utility.arrayArg(['test'])).toEqual(['test']);
    });
  });

  describe('trimLeftEscapeCharacters()', () => {
    test('should remove escape characters from the beginning of a string', () => {
      expect(utility.trimLeftEscapeCharacters('test')).toBe('test');
      expect(utility.trimLeftEscapeCharacters('/test')).toBe('test');
      expect(utility.trimLeftEscapeCharacters('\\test')).toBe('test');
    });
  });

  describe('compareDates()', () => {
    test('should compare dates using only the date part and ignoring time', () => {
      expect(utility.compareDates(
        new Date('2021-05-15T19:29:01+00:00'),
        new Date('2021-05-15T21:59:01+00:00')
      )).toBe(true);
      expect(utility.compareDates(
        new Date('2021-05-15T19:29:01+00:00'),
        new Date('2021-05-16T21:59:01+00:00')
      )).toBe(false);
    });
  });

  describe('coerceUndefined()', () => {
    test('should coerce undefined values depending on the specified type', () => {
      expect(utility.coerceUndefined('test')).toBe('test');
      expect(utility.coerceUndefined(2)).toBe(2);
      expect(utility.coerceUndefined(undefined, 'string')).toBe('');
      expect(utility.coerceUndefined(undefined, 'int')).toBe(0);
      expect(utility.coerceUndefined(undefined)).toBe(0);
    });
  });

  describe('replaceTags()', () => {
    test('should replace tags in a string with control sequences', () => {
      expect(
        utility.replaceTags('test {b}bold{b} {b}no match {d}dim{d} {d}no match')
      ).toBe('test \x1b[1mbold\x1b[0m {b}no match \x1b[2mdim\x1b[0m {d}no match');
    });
  });

  describe('zip()', () => {
    test('should zip 2 arrays together', () => {
      expect(utility.zip(['a', 'b', 'c'], [1, 2, 3])).toEqual([
        ['a', 1],
        ['b', 2],
        ['c', 3]
      ]);
    });
  });
});