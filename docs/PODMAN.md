# Using Kanbn with Podman

This document explains how to use Kanbn with Podman, a daemonless container engine that's often used as an alternative to Docker, especially on systems like RHEL, Fedora, and CentOS.

## Basic Usage

```bash
# Pull the latest container image
podman pull quay.io/takinosh/kanbn:latest

# Run Kanbn commands using the container
podman run -it --rm \
  -v $(pwd):/workspace:Z \
  -w /workspace \
  -e OPENROUTER_API_KEY=$OPENROUTER_API_KEY \
  quay.io/takinosh/kanbn:latest kanbn <command>

# For example, to initialize a new board:
podman run -it --rm \
  -v $(pwd):/workspace:Z \
  -w /workspace \
  quay.io/takinosh/kanbn:latest kanbn init

# Or to view your board:
podman run -it --rm \
  -v $(pwd):/workspace:Z \
  -w /workspace \
  quay.io/takinosh/kanbn:latest kanbn board
```

Note the `:Z` flag on the volume mount (`-v $(pwd):/workspace:Z`). This is necessary when using Podman on SELinux-enabled systems (like RHEL) to adjust the SELinux context of the mounted directory, allowing the container to write to it.

## Using Ollama with Kanbn in Podman

As of v0.14.0, Kanbn has improved support for connecting to Ollama from within containers:

```bash
# Run Kanbn with Ollama (running on the host)
podman run -it --rm \
  --network=host \
  -v $(pwd):/workspace:Z \
  -w /workspace \
  -e USE_OLLAMA=true \
  -e OLLAMA_HOST=http://localhost:11434 \
  -e OLLAMA_MODEL=llama3:latest \
  quay.io/takinosh/kanbn:latest kanbn chat
```

## Using Integrations with Podman

Kanbn supports knowledge integrations that enhance AI context. To list and use integrations:

```bash
# List available integrations
podman run -it --rm \
  --network=host \
  -v $(pwd):/workspace:Z \
  -w /workspace \
  -e DEBUG=true \
  -e USE_OLLAMA=true \
  -e OLLAMA_HOST=http://localhost:11434 \
  quay.io/takinosh/kanbn:latest kanbn integrations list

# Chat with integrations
podman run -it --rm \
  --network=host \
  -v $(pwd):/workspace:Z \
  -w /workspace \
  -e USE_OLLAMA=true \
  -e OLLAMA_HOST=http://localhost:11434 \
  quay.io/takinosh/kanbn:latest kanbn chat --with-integrations
```

## Container Bootstrap Script

For more advanced container usage, Kanbn provides a `bootstrap_container.sh` script that can initialize a complete Kanbn environment in a container.

### Basic Bootstrap Usage

```bash
podman run --rm \
  --network=host \
  -v $(pwd):/workspace:Z \
  -w /workspace \
  -e PROJECT_NAME="My Container Project" \
  -e USE_OLLAMA=true \
  -e OLLAMA_HOST=http://localhost:11434 \
  quay.io/takinosh/kanbn:latest ./examples/bootstrap_container.sh
```

### Project Modes

The bootstrap script supports three project modes:

#### Mode 1: Clone and set up a new GitHub repository

```bash
podman run --rm \
  --network=host \
  -v $(pwd):/workspace:Z \
  -w /workspace \
  -e PROJECT_MODE=1 \
  -e GITHUB_REPO_URL=https://github.com/tosin2013/sno-quickstarts.git \
  -e USE_OLLAMA=true \
  -e OLLAMA_HOST=http://localhost:11434 \
  quay.io/takinosh/kanbn:latest ./examples/bootstrap_container.sh
```

#### Mode 2: Work with an existing local repository

```bash
podman run -it --rm \
  --network=host \
  -v $(pwd):/workspace:Z \
  -w /workspace \
  -e USE_OLLAMA=true \
  -e OLLAMA_HOST=http://localhost:11434 \
  quay.io/takinosh/kanbn:latest examples/bootstrap_container.sh
```

#### Mode 3: Initialize a new project in the current directory (default)

```bash
podman run --rm \
  --network=host \
  -v $(pwd):/workspace:Z \
  -w /workspace \
  -e PROJECT_MODE=3 \
  -e USE_OLLAMA=true \
  -e OLLAMA_HOST=http://localhost:11434 \
  quay.io/takinosh/kanbn:latest ./examples/bootstrap_container.sh
```

## Environment Variables

### General Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `PROJECT_MODE` | Project initialization mode (1, 2, or 3) | `3` |
| `PROJECT_NAME` | Name of the Kanbn project | `Container Project` |
| `PROJECT_DESCRIPTION` | Description of the Kanbn project | `A project initialized in a container environment` |

### AI Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `USE_OLLAMA` | Whether to use Ollama for AI capabilities | `false` |
| `OLLAMA_HOST` | Ollama API URL | `http://localhost:11434` |
| `OLLAMA_MODEL` | Ollama model to use | `llama3:latest` |
| `OPENROUTER_API_KEY` | OpenRouter API key | None |
| `OPENROUTER_MODEL` | OpenRouter model to use | `google/gemma-3-4b-it:free` |
| `DEBUG` | Enable debug logging | `false` |

## Quickstart Examples

Here are some practical examples to help you get started with kanbn using Podman:

### Testing Ollama Connectivity

Before using kanbn with Ollama, you can test if Ollama is accessible from the container:

```bash
podman run -it --rm --network=host -v $(pwd):/workspace:Z -w /workspace \
  -e OLLAMA_HOST=http://localhost:11434 \
  quay.io/takinosh/kanbn:latest curl -v http://localhost:11434
```

If successful, you'll see a connection to the Ollama API.

### Using the Bootstrap Script

```bash
podman run -it --rm --network=host -v $(pwd):/workspace:Z -w /workspace -e OPENROUTER_API_KEY=your-openrouter-key -e OPENROUTER_MODEL=google/gemma-3-4b-it:free -e USE_OLLAMA=false -e OLLAMA_HOST=http://localhost:11434 quay.io/takinosh/kanbn:latest bash bootstrap_container.sh
```

### Viewing Your Kanban Board

To view your current kanbn board:

```bash
podman run -it --rm --network=host -v $(pwd):/workspace:Z -w /workspace \
  -e DEBUG=true \
  -e OPENROUTER_API_KEY=your-openrouter-key \
  -e OPENROUTER_MODEL=google/gemma-3-4b-it:free \
  -e USE_OLLAMA=false \
  quay.io/takinosh/kanbn:latest kanbn board
```

### Using AI Chat with Integrations

To chat with the AI assistant using your project integrations:

```bash
podman run -it --rm --network=host -v $(pwd):/workspace:Z -w /workspace \
  -e DEBUG=false \
  -e OPENROUTER_API_KEY=your-openrouter-key \
  -e OPENROUTER_MODEL=google/gemma-3-4b-it:free \
  -e USE_OLLAMA=false \
  kanbn-fixed:latest kanbn chat --with-integrations --message "Analyze the predefined tasks and suggest additional tasks or improvements for the project. What would we like to start with"
```

This example uses OpenRouter instead of Ollama for AI capabilities by setting `USE_OLLAMA=false`.

## Troubleshooting

### SELinux Issues

If you encounter permission errors on SELinux-enabled systems:

* **Symptom:** Error messages about permission denied when trying to access or write to files.
* **Solution:** Append `:Z` to your volume mounts (`-v host-path:container-path:Z`).

### Ollama Connectivity

* If you're having trouble connecting to Ollama, ensure:
  1. Ollama is running on your host machine
  2. You're using `--network=host` with your Podman command
  3. The `OLLAMA_HOST` is set to `http://localhost:11434`

### Integrations List Not Working

* If the `kanbn integrations list` command shows help text instead of listing integrations:
  1. Make sure you're using the fixed container image or our patch
  2. Enable debugging with `-e DEBUG=true` to see detailed logs
  3. Ensure the `.kanbn/integrations` directory exists in your project

### Vector Store Creation Errors

* If you see `Error in vector store creation: fetch failed`:
  1. Make sure Ollama is running and the model is available
  2. Try using a different model with `-e OLLAMA_MODEL=mistral:latest`
  3. Or disable Ollama and use hash-based embeddings with `-e USE_OLLAMA=false`
