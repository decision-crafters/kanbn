/**
 * Command patterns for parsing chat messages
 */
const commandPatterns = {
  createTask: /^(create|add) (task|issue)( called| named)? "?([^"]+)"?/i,
  addSubtask: /^add subtask "([^"]+)" to "?([^"]+)"?/i,
  moveTask: /^move "?([^"]+)"? to ([^"]+)/i,
  comment: /^(add )?comment "([^"]+)" (on|to) "?([^"]+)"?/i,
  complete: /^(complete|finish|mark done) "?([^"]+)"?/i,
  status: /^(show )?(status|progress|board)/i
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
