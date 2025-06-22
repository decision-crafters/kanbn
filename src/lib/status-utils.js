const humanizeDuration = require('humanize-duration');
const taskUtils = require('./task-utils');
const indexUtils = require('./index-utils');

/**
 * Calculate assigned task totals and workloads
 * @param {object[]} tasks List of tasks
 * @return {object} Object with assigned task statistics
 */
function calculateAssignedTaskStats(tasks) {
  return tasks.reduce((a, task) => {
    if ("assigned" in task.metadata) {
      if (!(task.metadata.assigned in a)) {
        a[task.metadata.assigned] = {
          total: 0,
          workload: 0,
          remainingWorkload: 0,
        };
      }
      a[task.metadata.assigned].total++;
      a[task.metadata.assigned].workload += task.workload;
      a[task.metadata.assigned].remainingWorkload += task.remainingWorkload;
    }
    return a;
  }, {});
}

/**
 * Calculate AI interaction metrics
 * @param {object[]} tasks List of tasks
 * @return {object|null} AI metrics object or null if no AI interactions
 */
function calculateAIMetrics(tasks) {
  const aiInteractions = tasks.filter(task =>
    task.metadata.tags &&
    task.metadata.tags.includes('ai-interaction')
  );

  if (aiInteractions.length === 0) {
    return null;
  }

  const metrics = {
    total: aiInteractions.length,
    byType: {}
  };

  for (let interaction of aiInteractions) {
    if (interaction.metadata.tags) {
      for (let tag of interaction.metadata.tags) {
        if (tag !== 'ai-interaction') {
          if (!(tag in metrics.byType)) {
            metrics.byType[tag] = 0;
          }
          metrics.byType[tag]++;
        }
      }
    }
  }

  return metrics;
}

/**
 * Calculate parent-child relationship metrics
 * @param {object[]} tasks List of tasks
 * @return {object|null} Relationship metrics or null if no relationships
 */
function calculateRelationMetrics(tasks) {
  const parentTasks = tasks.filter(task =>
    task.relations &&
    task.relations.some(relation => relation.type === 'parent-of')
  );

  const childTasks = tasks.filter(task =>
    task.relations &&
    task.relations.some(relation => relation.type === 'child-of')
  );

  if (parentTasks.length === 0 && childTasks.length === 0) {
    return null;
  }

  return {
    parentTasks: parentTasks.length,
    childTasks: childTasks.length
  };
}

/**
 * Calculate column workloads
 * @param {object[]} tasks List of tasks
 * @param {string[]} columnNames List of column names
 * @return {object} Object with total and per-column workload statistics
 */
function calculateColumnWorkloads(tasks, columnNames) {
  let totalWorkload = 0;
  let totalRemainingWorkload = 0;
  
  const columnWorkloads = tasks.reduce(
    (a, task) => {
      totalWorkload += task.workload;
      totalRemainingWorkload += task.remainingWorkload;
      a[task.column].workload += task.workload;
      a[task.column].remainingWorkload += task.remainingWorkload;
      return a;
    },
    Object.fromEntries(
      columnNames.map((columnName) => [
        columnName,
        {
          workload: 0,
          remainingWorkload: 0,
        },
      ])
    )
  );
  
  return {
    totalWorkload,
    totalRemainingWorkload,
    columnWorkloads
  };
}

/**
 * Calculate task workloads
 * @param {object} index The index object
 * @param {object[]} tasks List of tasks
 * @return {object} Object with task workload statistics
 */
function calculateTaskWorkloads(index, tasks) {
  return Object.fromEntries(
    tasks.map((task) => [
      task.id,
      {
        workload: task.workload,
        progress: task.progress,
        remainingWorkload: task.remainingWorkload,
        completed: taskUtils.taskCompleted(index, task),
      },
    ])
  );
}

/**
 * Calculate sprint statistics
 * @param {object} index The index object
 * @param {object[]} tasks List of tasks
 * @param {string|number|null} sprint Sprint name, number, or null for current sprint
 * @return {object|null} Sprint statistics or null if no sprints defined
 */
function calculateSprintStats(index, tasks, sprint = null) {
  if (!("sprints" in index.options) || !index.options.sprints.length) {
    return null;
  }

  const sprints = index.options.sprints;
  
  const currentSprint = index.options.sprints.length;
  let sprintIndex = currentSprint - 1;

  if (sprint !== null) {
    if (typeof sprint === "number") {
      if (sprint < 1 || sprint > sprints.length) {
        throw new Error(`Sprint ${sprint} does not exist`);
      } else {
        sprintIndex = sprint - 1;
      }
    } else if (typeof sprint === "string") {
      sprintIndex = sprints.findIndex((s) => s.name === sprint);
      if (sprintIndex === -1) {
        throw new Error(`No sprint found with name "${sprint}"`);
      }
    }
  }

  const result = {
    number: sprintIndex + 1,
    name: sprints[sprintIndex].name,
    start: sprints[sprintIndex].start,
  };
  
  if (currentSprint - 1 !== sprintIndex) {
    if (sprintIndex === sprints.length - 1) {
      result.end = sprints[sprintIndex + 1].start;
    }
    result.current = currentSprint;
  }
  
  if (sprints[sprintIndex].description) {
    result.description = sprints[sprintIndex].description;
  }
  
  const sprintStartDate = sprints[sprintIndex].start;
  const sprintEndDate = sprintIndex === sprints.length - 1 ? new Date() : sprints[sprintIndex + 1].start;

  const duration = sprintEndDate - sprintStartDate;
  result.durationDelta = duration;
  result.durationMessage = humanizeDuration(duration, {
    largest: 3,
    round: true,
  });

  result.created = indexUtils.taskWorkloadInPeriod(tasks, "created", sprintStartDate, sprintEndDate);
  result.started = indexUtils.taskWorkloadInPeriod(tasks, "started", sprintStartDate, sprintEndDate);
  result.completed = indexUtils.taskWorkloadInPeriod(tasks, "completed", sprintStartDate, sprintEndDate);
  result.due = indexUtils.taskWorkloadInPeriod(tasks, "due", sprintStartDate, sprintEndDate);

  if ("customFields" in index.options) {
    for (let customField of index.options.customFields) {
      if (customField.type === "date") {
        result[customField.name] = indexUtils.taskWorkloadInPeriod(
          tasks,
          customField.name,
          sprintStartDate,
          sprintEndDate
        );
      }
    }
  }

  return result;
}

/**
 * Calculate period statistics for specified dates
 * @param {object} index The index object
 * @param {object[]} tasks List of tasks
 * @param {Date[]} dates Array of dates to calculate statistics for
 * @return {object|null} Period statistics or null if no dates specified
 */
function calculatePeriodStats(index, tasks, dates) {
  if (!dates || dates.length === 0) {
    return null;
  }

  const result = {};
  let periodStart, periodEnd;
  
  if (dates.length === 1) {
    periodStart = new Date(+dates[0]);
    periodStart.setUTCHours(0, 0, 0, 0);
    periodEnd = new Date(+dates[0]);
    periodEnd.setUTCHours(23, 59, 59, 999);
    result.start = periodStart;
    result.end = periodEnd;
  } else {
    result.start = periodStart = new Date(Math.min(...dates));
    result.end = periodEnd = new Date(Math.max(...dates));
  }
  
  result.created = indexUtils.taskWorkloadInPeriod(tasks, "created", periodStart, periodEnd);
  result.started = indexUtils.taskWorkloadInPeriod(tasks, "started", periodStart, periodEnd);
  result.completed = indexUtils.taskWorkloadInPeriod(tasks, "completed", periodStart, periodEnd);
  result.due = indexUtils.taskWorkloadInPeriod(tasks, "due", periodStart, periodEnd);

  if ("customFields" in index.options) {
    for (let customField of index.options.customFields) {
      if (customField.type === "date") {
        result[customField.name] = indexUtils.taskWorkloadInPeriod(
          tasks, 
          customField.name, 
          periodStart, 
          periodEnd
        );
      }
    }
  }

  return result;
}

/**
 * Calculate due tasks information
 * @param {object[]} tasks List of tasks
 * @return {object[]} Array of due task information
 */
function calculateDueTasks(tasks) {
  const dueTasks = [];
  
  tasks.forEach((task) => {
    if ("dueData" in task) {
      dueTasks.push({
        task: task.id,
        workload: task.workload,
        progress: task.progress,
        remainingWorkload: task.remainingWorkload,
        ...task.dueData,
      });
    }
  });
  
  return dueTasks;
}

module.exports = {
  calculateAssignedTaskStats,
  calculateAIMetrics,
  calculateRelationMetrics,
  calculateColumnWorkloads,
  calculateTaskWorkloads,
  calculateSprintStats,
  calculatePeriodStats,
  calculateDueTasks
};
