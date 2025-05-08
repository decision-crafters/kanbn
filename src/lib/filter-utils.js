const utility = require('../utility');

/**
 * Check if an input string matches a filter string
 * @param {string|string[]} filter A filter string or array of filter strings
 * @param {string} input The string to match against
 * @return {boolean} True if the input matches the string filter
 */
function stringFilter(filter, input) {
  if (Array.isArray(filter)) {
    return filter.some((f) => input.indexOf(f) !== -1);
  }
  return input.indexOf(filter) !== -1;
}

/**
 * Check if an input date matches a date, or if multiple dates are passed in, check if the input is between
 * the earliest and latest dates
 * @param {Date|Date[]} filter A filter date or array of filter dates
 * @param {Date} input The date to match against
 * @return {boolean} True if the input matches the date filter
 */
function dateFilter(filter, input) {
  const dates = Array.isArray(filter) ? filter : [filter];
  if (dates.length === 1) {
    return utility.compareDates(input, dates[0]);
  }
  const earliest = Math.min(...dates);
  const latest = Math.max(...dates);
  return input >= earliest && input <= latest;
}

/**
 * Check if the input matches a number, or if multiple numbers are passed in, check if the input is between the
 * minimum and maximum numbers
 * @param {number|number[]} filter A filter number or array of filter numbers
 * @param {number} input The number to match against
 * @return {boolean} True if the input matches the number filter
 */
function numberFilter(filter, input) {
  filter = Array.isArray(filter) ? filter : [filter];
  return input >= Math.min(...filter) && input <= Math.max(...filter);
}

module.exports = {
  stringFilter,
  dateFilter,
  numberFilter,
};
