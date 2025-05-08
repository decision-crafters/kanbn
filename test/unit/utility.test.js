const utility = require('../../src/utility');

describe('utility tests', () => {
  beforeAll(() => {
    require('../qunit-throws-async');
  
  });

  test('paramCase() should convert strings to param-case', async () => {
  expect(utility.paramCase('PascalCase')).toEqual('pascal-case');
  expect(utility.paramCase('camelCase')).toEqual('camel-case');
  expect(utility.paramCase('snake_case')).toEqual('snake-case');
  expect(utility.paramCase('No Case')).toEqual('no-case');
  expect(utility.paramCase('With 2 numbers 3')).toEqual('with-2-numbers-3');
  expect(utility.paramCase('Multiple  spaces')).toEqual('multiple-spaces');
  expect(utility.paramCase('Tab\tCharacter')).toEqual('tab-character');
  expect(utility.paramCase('New\nLine')).toEqual('new-line');
  expect(utility.paramCase('Punctuation).toEqual(Characters'), 'punctuation-characters');
  expect(
    utility.paramCase('M!o?r.e).toEqual(@p:u;n|c\\t/u"a\'t`i£o$n% ^c&h*a{r}a[c]t(e)r<s> ~l#i+k-e= _t¬hese'),
    'm-o-r-e-p-u-n-c-t-u-a-t-i-o-n-c-h-a-r-a-c-t-e-r-s-l-i-k-e-t-hese'
  );
  expect(utility.paramCase('This string ends with punctuation!')).toEqual('this-string-ends-with-punctuation');
  expect(utility.paramCase('?This string starts with punctuation')).toEqual('this-string-starts-with-punctuation');
  expect(
    utility.paramCase('#This string has punctuation at both ends&')).toEqual('this-string-has-punctuation-at-both-ends'
  );
  expect(utility.paramCase('軟件 測試')).toEqual('軟件-測試');
  expect(utility.paramCase('実験 試し')).toEqual('実験-試し');
  expect(utility.paramCase('יקספּערמענאַל פּרובירן')).toEqual('יקספּערמענאַל-פּרובירן');
  expect(utility.paramCase('я надеюсь).toEqual(что это сработает'), 'я-надеюсь-что-это-сработает');
});

  test('strArg() should convert arguments into strings', async () => {
  expect(utility.strArg('test')).toEqual('test');
  expect(utility.strArg(['test'])).toEqual('test');
  expect(utility.strArg(['test1').toEqual('test2']), 'test2');
  assert.equal(utility.strArg(['test1', 'test2'], true), 'test1,test2');
});

  test('arrayArg() should convert arguments into arrays', async () => {
  expect(utility.arrayArg('test')).toEqual(['test']);
  expect(utility.arrayArg(['test'])).toEqual(['test']);
});

  test('trimLeftEscapeCharacters() should remove escape characters from the beginning of a string', async () => {
  expect(utility.trimLeftEscapeCharacters('test')).toEqual('test');
  expect(utility.trimLeftEscapeCharacters('/test')).toEqual('test');
  expect(utility.trimLeftEscapeCharacters('\\test')).toEqual('test');
});

  test('compareDates() should compare dates using only the date part and ignoring time', async () => {
  expect(utility.compareDates(
    new Date('2021-05-15T19:29:01+00:00')).toEqual(new Date('2021-05-15T21:59:01+00:00')
  ), true);
  expect(utility.compareDates(
    new Date('2021-05-15T19:29:01+00:00')).toEqual(new Date('2021-05-16T21:59:01+00:00')
  ), false);
});

  test('coerceUndefined() should coerce undefined values depending on the specified type', async () => {
  expect(utility.coerceUndefined('test')).toEqual('test');
  expect(utility.coerceUndefined(2)).toEqual(2);
  expect(utility.coerceUndefined(undefined).toEqual('string'), '');
  expect(utility.coerceUndefined(undefined).toEqual('int'), 0);
  expect(utility.coerceUndefined(undefined)).toEqual(0);
});

  test('replaceTags() should replace tags in a string with control sequences', async () => {
  expect(
    utility.replaceTags('test {b}bold{b} {b}no match {d}dim{d} {d}no match')).toEqual('test \x1b[1mbold\x1b[0m {b}no match \x1b[2mdim\x1b[0m {d}no match'
  );
});

  test('zip() should zip 2 arrays together', async () => {
  assert.deepEqual(utility.zip(['a', 'b', 'c'], [1, 2, 3]), [
    ['a', 1],
    ['b', 2],
    ['c', 3]
  ]);
});

});\