/**
 * Class to maintain context during chat conversations
 */
class ChatContext {
  constructor() {
    this.lastTaskId = null;
    this.taskNameMap = new Map();
    this.columnNames = new Set(['Backlog']); // Default column
  }

  /**
   * Set the most recently referenced task
   * @param {string} taskId The task ID
   * @param {string} taskName The task name
   */
  setLastTask(taskId, taskName) {
    this.lastTaskId = taskId;
    if (taskName) {
      this.taskNameMap.set(taskName.toLowerCase(), taskId);
    }
  }

  /**
   * Update available column names from the index
   * @param {object} index The Kanbn index object
   */
  setColumns(index) {
    if (index && index.columns) {
      this.columnNames = new Set(Object.keys(index.columns));
      if (this.columnNames.size === 0) {
        this.columnNames.add('Backlog');
      }
    }
  }

  /**
   * Resolve a task reference to its ID
   * @param {string} ref The task reference (name or contextual reference)
   * @return {string|null} The task ID or null if not found
   */
  resolveTaskReference(ref) {
    const refLower = ref.toLowerCase();
    if (refLower === 'it' || refLower === 'that task' || refLower === 'this task') {
      return this.lastTaskId;
    }
    return this.taskNameMap.get(refLower) || null;
  }

  /**
   * Validate a column name
   * @param {string} column The column name to validate
   * @return {boolean} True if the column exists
   */
  isValidColumn(column) {
    return this.columnNames.has(column);
  }

  /**
   * Clear the context
   */
  clear() {
    this.lastTaskId = null;
    this.taskNameMap.clear();
    this.columnNames = new Set(['Backlog']);
  }
}

module.exports = ChatContext;
