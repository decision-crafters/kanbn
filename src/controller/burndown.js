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
      if (!data.series || data.series.length === 0 || !data.series[0].dataPoints || data.series[0].dataPoints.length === 0) {
        // Return empty data if no data points are available
        return {
          total: 0,
          completed: 0,
          data: []
        };
      }

      const result = {
        total: data.series[0].total || 0,
        completed: (data.series[0].total || 0) - (data.series[0].dataPoints[0]?.y || 0),
        data: data.series[0].dataPoints.map(point => ({
          date: point.x,
          remaining: point.y
        }))
      };
      return result;
    }

    // Render chart for console output
    const PADDING = '     ';
    // Ensure we have a valid terminal width, with a reasonable fallback
    const termWidth = term.width || 80; // Default to 80 if term.width is undefined
    const width = Math.max(10, termWidth - (PADDING.length + 1)); // Ensure minimum width of 10

    const plots = [];
    for (const s of data.series) {
      // Ensure we have data points before creating a plot
      if (!s.dataPoints || s.dataPoints.length === 0) {
        console.log('No data points available for the selected time period.');
        return '';
      }

      const plot = [];
      // Ensure the time range is valid
      const timeRange = s.to.getTime() - s.from.getTime();
      if (timeRange <= 0) {
        // If time range is invalid, create a flat line with the current workload
        // Ensure we don't create an array that's too large
        const safeWidth = Math.min(width, 1000); // Cap at 1000 points to prevent memory issues
        for (let i = 0; i < safeWidth; i++) {
          plot.push(s.dataPoints[0].y);
        }
      } else {
        // Calculate points for the plot
        const delta = Math.max(1, Math.floor(timeRange / width));
        // Ensure we don't create an array that's too large
        const safeWidth = Math.min(width, 1000); // Cap at 1000 points to prevent memory issues
        for (let i = 0; i < safeWidth; i++) {
          const targetTime = s.from.getTime() + i * delta;
          const dataPoint = s.dataPoints.find(d => d.x.getTime() >= targetTime) || s.dataPoints[s.dataPoints.length - 1];
          plot.push(dataPoint.y);
        }
      }
      plots.push(plot);
    }

    const dateFormat = kanbn.getDateFormat(index);
    console.log(`${formatDate(data.series[0].from, dateFormat)} to ${formatDate(data.series[0].to, dateFormat)}:`);

    // Check if we have enough data to plot
    if (plots.length === 0 || plots[0].length === 0) {
      console.log('    0┼───────────────────────────────────────────────────────────────────────────────────── ');
    } else {
      try {
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
      } catch (chartError) {
        // Fallback to a simple line if chart generation fails
        console.log('    0┼───────────────────────────────────────────────────────────────────────────────────── ');
        console.log('    (Not enough data to generate a meaningful chart)');
      }
    }
    return '';
  } catch (error) {
    if (args.json) {
      throw error;
    }
    utility.error(error);
    return '';
  }
};
