/**
 * Utility for building AI prompts from task data
 */

/**
 * Build a prompt for a task that can be used with AI tools
 * @param {object} task - The task object
 * @return {string} - The formatted prompt
 */
function buildPromptForTask(task) {
  if (!task) {
    throw new Error('Task is null or undefined');
  }

  const parts = [];

  // Add a separator at the top
  parts.push('=' .repeat(80));

  // Add task name and ID
  parts.push(`# Task: ${task.name}`);
  parts.push(`ID: ${task.id}`);

  // Add description if available
  if (task.description && task.description.trim()) {
    parts.push('\n## Description');
    parts.push(task.description.trim());
  }

  // Add metadata if available
  if (task.metadata && Object.keys(task.metadata).length > 0) {
    parts.push('\n## Metadata');

    // Format dates
    if (task.metadata.created) {
      parts.push(`- Created: ${task.metadata.created instanceof Date ? task.metadata.created.toISOString() : task.metadata.created}`);
    }

    if (task.metadata.updated) {
      parts.push(`- Updated: ${task.metadata.updated instanceof Date ? task.metadata.updated.toISOString() : task.metadata.updated}`);
    }

    if (task.metadata.started) {
      parts.push(`- Started: ${task.metadata.started instanceof Date ? task.metadata.started.toISOString() : task.metadata.started}`);
    }

    if (task.metadata.completed) {
      parts.push(`- Completed: ${task.metadata.completed instanceof Date ? task.metadata.completed.toISOString() : task.metadata.completed}`);
    }

    if (task.metadata.due) {
      parts.push(`- Due: ${task.metadata.due instanceof Date ? task.metadata.due.toISOString() : task.metadata.due}`);
    }

    // Add progress if available
    if (task.metadata.progress !== undefined) {
      parts.push(`- Progress: ${task.metadata.progress}%`);
    }

    // Add tags if available
    if (task.metadata.tags && task.metadata.tags.length > 0) {
      parts.push(`- Tags: ${task.metadata.tags.join(', ')}`);
    }

    // Add assigned if available
    if (task.metadata.assigned) {
      parts.push(`- Assigned to: ${task.metadata.assigned}`);
    }

    // Add references if available
    if (task.metadata.references && task.metadata.references.length > 0) {
      parts.push('\n### References');
      task.metadata.references.forEach(ref => {
        parts.push(`- ${ref}`);
      });
    }
  }

  // Add sub-tasks if available
  if (task.subTasks && task.subTasks.length > 0) {
    parts.push('\n## Sub-tasks');
    task.subTasks.forEach(subTask => {
      parts.push(`- [${subTask.completed ? 'x' : ' '}] ${subTask.text}`);
    });
  }

  // Add relations if available
  if (task.relations && task.relations.length > 0) {
    parts.push('\n## Relations');
    task.relations.forEach(relation => {
      parts.push(`- ${relation.type ? `${relation.type} ` : ''}${relation.task}`);
    });
  }

  // Add comments if available
  if (task.comments && task.comments.length > 0) {
    parts.push('\n## Comments');
    task.comments.forEach(comment => {
      const commentParts = [];

      if (comment.author) {
        commentParts.push(`Author: ${comment.author}`);
      }

      if (comment.date) {
        commentParts.push(`Date: ${comment.date instanceof Date ? comment.date.toISOString() : comment.date}`);
      }

      if (comment.text) {
        commentParts.push(comment.text);
      }

      parts.push(`- ${commentParts.join('\n  ')}`);
    });
  }

  // Add a prompt section at the end
  parts.push('\n## AI Prompt');
  parts.push('Please analyze this task and provide insights, suggestions, or next steps based on the information above.');

  // Add a separator at the bottom
  parts.push('\n' + '=' .repeat(80));

  return parts.join('\n');
}

module.exports = {
  buildPromptForTask
};
