# Implementation Plan: Enhanced Task Context in AI Conversations

## 1. Diagnosis
- The current implementation includes task IDs and names in the system prompt
- However, detailed task information (descriptions, due dates, tags, metadata) is not being included
- This explains why the AI knows the task exists but can't provide detailed information

## 2. Proposed Changes

### A. Enhance ProjectContext.extractBoardData
1. Modify the `extractBoardData` method to include comprehensive task details:
   - Task descriptions
   - Due dates
   - Tags
   - Status
   - Custom metadata

### B. Add Task Detail Fetching
1. Create a specific task detail retrieval method in ProjectContext
2. This method should be called when users ask about a specific task
3. Implement response formatting based on task structure

### C. Memory Improvements
1. Enhance conversation memory to remember which tasks have been previously discussed
2. Allow the AI to reference task details across multiple messages

### D. Command Enhancements
1. Add task management commands directly in the chat interface
2. Support natural language commands like "show details of [task]"

## 3. GitHub Implementation Steps

1. Create a new branch: `feature/enhanced-task-context`
2. Update `ProjectContext.js` to fetch and format comprehensive task data
3. Modify `chat-controller.js` to support task detail requests
4. Update the system prompt template to better utilize task information
5. Add unit tests for the new functionality
6. Create integration tests demonstrating the task context in conversations
7. Document the new conversation capabilities

## 4. Technical Details

```javascript
// Example enhancement for extractBoardData
extractBoardData(context) {
  // Current code...
  
  // Enhanced section to include detailed task information
  for (const taskId of tasks) {
    const task = context.tasks[taskId];
    result += `- ${taskId}: ${task.name}${task.due ? ` (Due: ${task.due})` : ''}\n`;
    
    // Add description (if available)
    if (task.description) {
      // Format multi-line descriptions properly
      const formattedDescription = task.description
        .split('\n')
        .map(line => `    ${line}`)
        .join('\n');
      result += `    Description: ${formattedDescription}\n`;
    }
    
    // Add tags (if available)
    if (task.tags && task.tags.length > 0) {
      result += `    Tags: ${task.tags.join(', ')}\n`;
    }
    
    // Add metadata (if available)
    if (task.metadata) {
      const metadataKeys = Object.keys(task.metadata);
      if (metadataKeys.length > 0) {
        result += `    Metadata: ${metadataKeys.map(key => `${key}=${task.metadata[key]}`).join(', ')}\n`;
      }
    }
  }
}
```

## 5. Timeline and Priority

1. High priority:
   - Enhance task detail extraction in system prompt
   - Add task detail retrieval in chat controller
   
2. Medium priority:
   - Memory improvements for task context
   - Integration tests for task detail queries
   
3. Low priority:
   - Command enhancements
   - Documentation updates

## 6. Acceptance Criteria

- Users can ask about specific task details and receive comprehensive information
- Task descriptions, due dates, tags, and metadata are included in responses
- Conversation history maintains knowledge of previously discussed tasks
- Command syntax for task management works in both explicit and natural language forms
