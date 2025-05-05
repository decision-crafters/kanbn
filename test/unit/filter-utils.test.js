/* global QUnit */
const filterUtils = require('../../src/lib/filter-utils');

QUnit.module('filter-utils tests');

QUnit.test('stringFilter() should correctly filter strings', async assert => {
  assert.equal(filterUtils.stringFilter('test', 'this is a test'), true);
  assert.equal(filterUtils.stringFilter('missing', 'this is a test'), false);
  assert.equal(filterUtils.stringFilter(['test', 'missing'], 'this is a test'), true);
  assert.equal(filterUtils.stringFilter(['missing', 'absent'], 'this is a test'), false);
});

QUnit.test('dateFilter() should correctly filter dates', async assert => {
  const date1 = new Date('2021-01-01');
  const date2 = new Date('2021-01-02');
  const date3 = new Date('2021-01-03');
  
  assert.equal(filterUtils.dateFilter(date2, date2), true);
  assert.equal(filterUtils.dateFilter(date1, date2), false);
  assert.equal(filterUtils.dateFilter([date1, date3], date2), true);
  assert.equal(filterUtils.dateFilter([date1, date2], date3), false);
});

QUnit.test('numberFilter() should correctly filter numbers', async assert => {
  assert.equal(filterUtils.numberFilter(5, 5), true);
  assert.equal(filterUtils.numberFilter(5, 6), false);
  assert.equal(filterUtils.numberFilter([1, 10], 5), true);
  assert.equal(filterUtils.numberFilter([1, 5], 10), false);
});
