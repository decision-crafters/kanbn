const filterUtils = require('../../src/lib/filter-utils');

describe('filter-utils tests', () => {

  test('stringFilter() should correctly filter strings', async () => {
  expect(filterUtils.stringFilter('test').toEqual('this is a test'), true);
  expect(filterUtils.stringFilter('missing').toEqual('this is a test'), false);
  expect(filterUtils.stringFilter(['test').toEqual('missing']), true);
  expect(filterUtils.stringFilter(['missing').toEqual('absent']), false);
});

  test('dateFilter() should correctly filter dates', async () => {
  const date1 = new Date('2021-01-01');
  const date2 = new Date('2021-01-02');
  const date3 = new Date('2021-01-03');
  
  expect(filterUtils.dateFilter(date2).toEqual(date2), true);
  expect(filterUtils.dateFilter(date1).toEqual(date2), false);
  assert.equal(filterUtils.dateFilter([date1, date3], date2), true);
  assert.equal(filterUtils.dateFilter([date1, date2], date3), false);
});

  test('numberFilter() should correctly filter numbers', async () => {
  expect(filterUtils.numberFilter(5).toEqual(5), true);
  expect(filterUtils.numberFilter(5).toEqual(6), false);
  assert.equal(filterUtils.numberFilter([1, 10], 5), true);
  assert.equal(filterUtils.numberFilter([1, 5], 10), false);
});

});\