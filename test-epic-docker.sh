#!/bin/bash
# Epic functionality test script for Docker
# Follows project conventions for Docker testing

# Create fixed test directory
TEST_DIR="/tmp/kanbn-epic-test"
echo "Epic test directory: $TEST_DIR"
mkdir -p $TEST_DIR

# Run the Docker container with proper network and environment setup
# Get API key from .env file
API_KEY=$(grep OPENROUTER_API_KEY /Users/tosinakinosho/kanbn/.env | cut -d'=' -f2)
echo "Using API key: ${API_KEY:0:5}...${API_KEY: -5}"

# Run the Docker container with proper network and environment setup
docker run --rm \
  --name kanbn-epic-test \
  --network ollama-network \
  -e DEBUG=true \
  -e KANBN_ENV=test \
  -e OPENROUTER_API_KEY="$API_KEY" \
  -e OPENROUTER_MODEL="google/gemma-3-4b-it:free" \
  -v $TEST_DIR:/workspace \
  -w /workspace \
  decision-crafters/kanbn:latest /bin/bash -c '
    # Initialize test environment
    echo "1. Installing jq for JSON parsing"
    apt-get update > /dev/null && apt-get install -y jq > /dev/null
    
    # Initialize kanbn with a test project
    echo "2. Initializing kanbn project"
    kanbn init --name "Epic Test" --description "Testing epic functionality"
    
    # Verify initialization
    echo "3. Verifying kanbn initialization"
    cat .kanbn/index.md
    
    # Create an epic using the chat command with proper format
    echo "4. Creating epic via chat command (direct argument)"
    kanbn chat "createEpic: User Authentication System"
    
    # List tasks and verify epic was created
    echo "5. Listing tasks to verify epic creation"
    ls -la .kanbn/tasks/
    echo "Running kanbn list command..."
    kanbn list > tasks.txt
    cat tasks.txt
    
    # Directly examine the task file to find epic metadata
    echo "Examining task content directly:"
    cat .kanbn/tasks/user-authentication-system.md
    
    # Check for epic type in the task metadata directly
    echo "6. Verifying epic metadata"
    if grep -q "type: epic" .kanbn/tasks/user-authentication-system.md; then
      echo "✅ Epic successfully created with type=epic"
      
      # Get the epic ID directly from the filename
      EPIC_ID="user-authentication-system"
      echo "  Epic ID: $EPIC_ID"
      
      # Decompose the epic
      echo "7. Decomposing epic"
      kanbn chat "decomposeEpic: $EPIC_ID"
      
      # Verify child tasks were created by looking at task files
      echo "8. Verifying child tasks"
      echo "Task files after decomposition:"
      ls -la .kanbn/tasks/
      
      # Count files that might be child tasks (excluding the original epic)
      TASK_COUNT=$(ls -1 .kanbn/tasks/ | wc -l)
      CHILD_COUNT=$((TASK_COUNT - 1))
      echo "  Child task count: $CHILD_COUNT"
      
      # Examine some of the task files to check for parent metadata
      echo "9. Examining task files for parent references"
      for task_file in $(ls -1 .kanbn/tasks/ | grep -v "$EPIC_ID"); do
        echo "Contents of $task_file:"
        cat ".kanbn/tasks/$task_file" | head -10
      done
      
      if [ "$CHILD_COUNT" -gt 0 ]; then
        echo "✅ Epic successfully decomposed into child tasks"
      else
        echo "❌ No child tasks found after decomposition"
      fi
    else
      echo "❌ No epic found in tasks"
    fi
    
    echo "Epic functionality test completed"
'

echo "Test completed. Results are in: $TEST_DIR"
