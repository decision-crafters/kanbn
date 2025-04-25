# Kanbn Docker Setup Guide

This guide explains how to set up and run Kanbn in a Docker container, leveraging Ollama for AI-powered features.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed on your system
- [Ollama](https://ollama.com/download) installed and running on your host system
- The `llama3` model (or another compatible model) pulled in your Ollama instance

## Setup Instructions

### 1. Install and Start Ollama on Your Host System

Before running the Kanbn Docker container, you need to have Ollama running on your host machine:

```bash
# Install Ollama (if not already installed)
# Visit https://ollama.com/download for installation instructions

# Start the Ollama service
ollama serve

# Pull the llama3 model (or your preferred model)
ollama pull llama3
```

Verify that Ollama is running and accessible at `http://localhost:11434`.

### 2. Building the Kanbn Docker Image

```bash
# Clone the repository (if you haven't already)
git clone https://github.com/decision-crafters/kanbn.git
cd kanbn

# Build the Docker image
docker-compose build
```

### 3. Running Kanbn in Docker

```bash
# Start the Kanbn container
docker-compose up -d

# Verify the container is running
docker-compose ps
```

The Kanbn container will connect to your host's Ollama instance using the `host.docker.internal` DNS name, which Docker provides to allow containers to access host services.

### 4. Using Kanbn with Docker

You can execute Kanbn commands within the Docker container. Here's the recommended initialization process:

#### Step 1: Create a Project Directory

```bash
# Create a new directory for your project
docker exec -it kanbn-dev mkdir -p /app/my-project
```

#### Step 2: Initialize a Basic Kanbn Board First

```bash
# Initialize a basic Kanbn board (this will prompt for project name and description)
docker exec -it kanbn-dev bash -c "cd /app/my-project && kanbn init"
```

You'll be prompted to enter:
- Project name
- Project description
- Whether to use recommended columns or custom ones

#### Step 3: Use AI for Task Generation (Optional)

After basic initialization, you can use the AI to generate tasks:

```bash
# Use AI to suggest tasks for your project
docker exec -it kanbn-dev bash -c "cd /app/my-project && kanbn chat --message 'Suggest tasks for my project'"
```

#### Step 4: Chat with the AI Assistant

```bash
# Start an interactive chat session with the AI assistant
docker exec -it kanbn-dev bash -c "cd /app/my-project && kanbn chat"
```

#### Advanced: Direct AI Initialization

Alternatively, you can try the direct AI-powered initialization (though this may need manual intervention if prompts time out):

```bash
# AI-powered initialization (may require interactive inputs)
docker exec -it kanbn-dev bash -c "cd /app/my-project && kanbn init --ai 'My project description'"
```

## Environment Variables

The Docker setup uses these environment variables:

- `OLLAMA_HOST`: Set to `http://host.docker.internal:11434` to connect to host's Ollama
- `OLLAMA_MODEL`: The model to use (default: `llama3`)
- `USE_OLLAMA`: Set to `true` to force the use of Ollama
- `OPENROUTER_API_KEY`: Left empty to ensure Ollama is used

## Testing Your Setup

### Verifying Ollama Connection

To verify that your Docker container can connect to your host's Ollama instance:

```bash
# Check that the container can reach the Ollama API
docker exec -it kanbn-dev curl -s http://host.docker.internal:11434/api/tags
```

If successful, you should see a JSON response listing available models.

### Testing the AI Chat Functionality

Create a simple test project and try a basic chat interaction:

```bash
# Create test directory
docker exec -it kanbn-dev mkdir -p /app/test-project

# Initialize basic board
docker exec -it kanbn-dev bash -c "cd /app/test-project && kanbn init"

# Simple chat test
docker exec -it kanbn-dev bash -c "cd /app/test-project && kanbn chat --message 'Hello, what can you help me with?'"
```

## Troubleshooting

### Host Connection Issues

If the container can't connect to your host's Ollama instance:

1. Ensure Ollama is running on your host machine: `ps aux | grep ollama`
2. Verify the Ollama service is working: `curl http://localhost:11434/api/tags`
3. Check if your Docker setup supports `host.docker.internal` (should work on Docker Desktop)
4. For Linux hosts, you might need to modify the configuration to use the host's actual IP instead
5. Try restarting the Ollama service: `ollama serve`

### Model Loading Issues

If you encounter model loading errors:

1. Verify the model is downloaded: `ollama list`
2. Try pulling the model again: `ollama pull llama3:latest`
3. Check Ollama logs for errors: `ollama logs`
4. Verify that the model name in your configuration matches exactly what's listed by `ollama list`

### Interactive Terminal Issues

If you encounter problems with the interactive terminal in Docker:

1. Ensure your terminal supports interactive mode
2. Try using the `-t` flag: `docker exec -t kanbn-dev kanbn init`
3. For Windows users, try using PowerShell or WSL instead of CMD

### Timeout Issues During AI Interactions

If AI requests time out:

1. Check if your Ollama service has sufficient resources
2. Try a smaller model if you're experiencing memory issues
3. Increase Docker resource limits (CPU/memory) if necessary

## Advanced Configuration

### Using a Different AI Model

To use a different model:

1. Pull the model on your host: `ollama pull mistral`
2. Update the `OLLAMA_MODEL` environment variable in docker-compose.yml:

```yaml
environment:
  - OLLAMA_MODEL=mistral
```

### Using OpenRouter Instead of Ollama

If you prefer to use OpenRouter:

1. Obtain an OpenRouter API key
2. Update the environment variables in docker-compose.yml:

```yaml
environment:
  - OPENROUTER_API_KEY=your_api_key_here
  - OPENROUTER_MODEL=google/gemma-3-4b-it:free
  - USE_OLLAMA=false
```

## Notes

- This setup assumes Ollama is installed and running on the host machine
- The Docker container does not include Ollama to avoid duplication and resource overhead
- Models are managed on your host system, not in the container
