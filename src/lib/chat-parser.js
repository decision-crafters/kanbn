/**
 * Command patterns for parsing chat messages
 */
const commandPatterns = {
  // Existing commands
  createTask: /^(create|add) (task|issue)( called| named)? "?([^"]+)"?/i,
  addSubtask: /^add subtask "([^"]+)" to "?([^"]+)"?/i,
  moveTask: /^move "?([^"]+)"? to ([^"]+)/i,
  comment: /^(add )?comment "([^"]+)" (on|to) "?([^"]+)"?/i,
  complete: /^(complete|finish|mark done) "?([^"]+)"?/i,
  listTasksInColumn: /^(what|which|list|show)( tasks| items)( are)? in (the )?["']?([\w\s]+)["']?$/i,
  status: /^(show )?(status|progress|board)/i,
  
  // New commands
  deleteTask: /^(delete|remove) (task|issue) "?([^"]+)"?/i,
  searchTasks: /^(search|find)( for)? tasks( containing| with| having) "?([^"]+)"?/i,
  listTasksByTag: /^(show|list|what)( tasks| items)?( have| contain| are tagged with)? (tag|label) "?([^"]+)"?/i,
  listTasksByAssignee: /^(show|list|what)( tasks| items)?( are)? assigned to "?([^"]+)"?/i,
  showTaskDetails: /^(show|tell me about|details for|details of)( task| issue)? "?([^"]+)"?/i,
  showTaskStats: /^(show|what( is|'s)?) (workload|effort|stats|statistics)( in| for)? "?([^"]+)"?/i,
  addTaskTag: /^(tag|add tag to|label) (task|issue) "?([^"]+)"? (with|as) "?([^"]+)"?/i,
  removeTaskTag: /^(remove|delete) tag "?([^"]+)"? from (task|issue) "?([^"]+)"?/i,
  assignTask: /^(assign) (task|issue)? "?([^"]+)"? to "?([^"]+)"?/i,
  unassignTask: /^(unassign) (task|issue)? "?([^"]+)"?/i,
  updateTaskDescription: /^(update|change|set) description of "?([^"]+)"? to "?([^"]+)"?/i
};

/**
 * Parse a chat message to determine intent and parameters
 * @param {string} message The chat message to parse
 * @return {object} Object containing intent and parameters
 */
function parseMessage(message) {
  for (const [intent, pattern] of Object.entries(commandPatterns)) {
    const match = message.match(pattern);
    if (match) {
      // Remove undefined/empty captures and the full match
      const params = match.slice(1).filter(param => param !== undefined);
      return { intent, params };
    }
  }
  return { intent: 'chat', params: [message] };
}

module.exports = {
  parseMessage,
  commandPatterns
};
