const kanbnModule = require('../main');
const utility = require('../utility');
const asciichart = require('asciichart');
const term = require('terminal-kit').terminal;
const chrono = require('chrono-node');
const formatDate = require('dateformat');

module.exports = async args => {
  try {
    const kanbn = kanbnModule();

    // Make sure kanbn has been initialised
    if (!await kanbn.initialised()) {
      throw new Error('Kanbn has not been initialised in this folder\nTry running: kanbn init');
    }
    
    const index = await kanbn.getIndex();

    // Get sprint numbers or names
    let sprints = null;
    if (args.sprint) {
      sprints = utility.arrayArg(args.sprint)
        .flatMap(s => s.split(','))
        .map(s => s.trim())
        .filter(s => s.length > 0)
        .map(s => {
          const sprintNumber = parseInt(s);
          return isNaN(sprintNumber) ? s : sprintNumber;
        });

      // Verify sprint columns exist
      for (const sprint of sprints) {
        const sprintName = typeof sprint === 'number' ? `Sprint ${sprint}` : sprint;
        if (!index.columns[sprintName]) {
          throw new Error(`Sprint "${sprintName}" not found`);
        }
      }
    }

    // Get dates
    let dates = null;
    if (args.date) {
      dates = utility.arrayArg(args.date);
      if (dates.length) {
        for (let i = 0; i < dates.length; i++) {
          const dateValue = chrono.parseDate(dates[i]);
          if (dateValue === null) {
            throw new Error(`Unable to parse date: "${dates[i]}"`);
          }
          dates[i] = dateValue;
        }
      }
    }

    // Get assigned
    let assigned = null;
    if (args.assigned) {
      assigned = utility.strArg(args.assigned);
    }

    // Get columns
    let columns = null;
    if (args.column) {
      columns = utility.arrayArg(args.column);
      // Verify columns exist
      for (const column of columns) {
        if (!index.columns[column]) {
          throw new Error(`Column "${column}" not found`);
        }
      }
    }

    // Get normalisation mode
    let normalise = null;
    if (args.normalise) {
      if (args.normalise === '0') {
        throw new Error('Normalisation value cannot be zero');
      }
      normalise = args.normalise.toLowerCase();
      if (!['days', 'hours', 'minutes', 'seconds'].includes(normalise)) {
        normalise = 'auto';
      }
    }

    // Get burndown data
    const data = await kanbn.burndown(sprints, dates, assigned, columns, normalise);

    if (args.json) {
      // Format data for JSON output
      const result = {
        total: data.series[0].total,
        completed: data.series[0].total - data.series[0].dataPoints[0].y,
        data: data.series[0].dataPoints.map(point => ({
          date: point.x,
          remaining: point.y
        }))
      };
      return result;
    }

    // Render chart for console output
    const PADDING = '     ';
    const width = term.width - (PADDING.length + 1);

    const plots = [];
    for (const s of data.series) {
      const plot = [];
      const delta = Math.floor((s.to.getTime() - s.from.getTime()) / width);
      for (let i = 0; i < width; i++) {
        plot.push((s.dataPoints.find(d => d.x >= new Date(s.from.getTime() + i * delta)) || s.dataPoints[0]).y);
      }
      plots.push(plot);
    }

    const dateFormat = kanbn.getDateFormat(index);
    console.log(`${formatDate(data.series[0].from, dateFormat)} to ${formatDate(data.series[0].to, dateFormat)}:`);
    console.log(asciichart.plot(
      plots,
      {
        offset: 2,
        height: 10,
        padding: PADDING,
        format: x => (PADDING + x.toFixed(0)).slice(-PADDING.length),
        colors: [
          asciichart.default,
          asciichart.green,
          asciichart.blue,
          asciichart.red
        ]
      }
    ));
    return '';
  } catch (error) {
    if (args.json) {
      throw error;
    }
    utility.error(error);
    return '';
  }
};
