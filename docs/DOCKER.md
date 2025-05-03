# Using Kanbn in Docker Containers

This document explains how to use Kanbn in Docker containers and other containerized environments.

## Basic Usage

```bash
# Pull the latest container image
docker pull quay.io/takinosh/kanbn:latest

# Run Kanbn commands using the container
docker run -it --rm \
  -v $(pwd):/workspace \
  -e OPENROUTER_API_KEY=$OPENROUTER_API_KEY \
  quay.io/takinosh/kanbn:latest kanbn <command>

# For example, to initialize a new board:
docker run -it --rm \
  -v $(pwd):/workspace \
  quay.io/takinosh/kanbn:latest kanbn init

# Or to view your board:
docker run -it --rm \
  -v $(pwd):/workspace \
  quay.io/takinosh/kanbn:latest kanbn board
```

The container mounts your current directory as `/workspace`, allowing Kanbn to manage tasks in your local project.

## Using Ollama with Kanbn in Docker

As of v0.14.0, Kanbn has improved support for connecting to Ollama from within Docker containers:

```bash
# Run Kanbn with Ollama (running on the host)
docker run -it --rm \
  -v $(pwd):/workspace \
  -e USE_OLLAMA=true \
  -e OLLAMA_HOST=http://host.docker.internal:11434 \
  -e OLLAMA_MODEL=qwen3 \
  --add-host=host.docker.internal:host-gateway \
  quay.io/takinosh/kanbn:latest kanbn chat
```

## Container Bootstrap Script

For more advanced container usage, Kanbn provides a `bootstrap_container.sh` script that can initialize a complete Kanbn environment in a container.

### Basic Bootstrap Usage

```bash
docker run --rm -v $(pwd):/workspace -w /workspace \
  -e PROJECT_NAME="My Container Project" \
  -e USE_OLLAMA=true \
  -e OLLAMA_HOST=http://host.docker.internal:11434 \
  --add-host=host.docker.internal:host-gateway \
  quay.io/takinosh/kanbn:latest ./examples/bootstrap_container.sh
```

### Project Modes

The bootstrap script supports three project modes:

#### Mode 1: Clone and set up a new GitHub repository

```bash
docker run --rm -v $(pwd):/workspace -w /workspace \
  -e PROJECT_MODE=1 \
  -e GITHUB_REPO_URL=https://github.com/tosin2013/sno-quickstarts.git \
  -e USE_OLLAMA=true \
  -e OLLAMA_HOST=http://host.docker.internal:11434 \
  --add-host=host.docker.internal:host-gateway \
  quay.io/takinosh/kanbn:latest ./examples/bootstrap_container.sh
```

#### Mode 2: Work with an existing local repository

```bash
docker run --rm -v $(pwd):/workspace -w /workspace \
  -e PROJECT_MODE=2 \
  -e REPO_PATH=/workspace/my-existing-repo \
  -e USE_OLLAMA=true \
  -e OLLAMA_HOST=http://host.docker.internal:11434 \
  --add-host=host.docker.internal:host-gateway \
  quay.io/takinosh/kanbn:latest ./examples/bootstrap_container.sh
```

#### Mode 3: Initialize a new project in the current directory (default)

```bash
docker run --rm -v $(pwd):/workspace -w /workspace \
  -e PROJECT_MODE=3 \
  -e USE_OLLAMA=true \
  -e OLLAMA_HOST=http://host.docker.internal:11434 \
  --add-host=host.docker.internal:host-gateway \
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
| `OLLAMA_MODEL` | Ollama model to use | `qwen3` |
| `OPENROUTER_API_KEY` | OpenRouter API key | None |
| `OPENROUTER_MODEL` | OpenRouter model to use | `google/gemma-3-4b-it:free` |

For a complete list of environment variables and advanced configuration options, see the [Container Bootstrap documentation](https://github.com/decision-crafters/kanbn/blob/master/examples/CONTAINER_BOOTSTRAP.md).

## Using with Docker Compose

```yaml
version: '3'
services:
  kanbn-init:
    image: quay.io/takinosh/kanbn:latest
    volumes:
      - ./:/workspace
    environment:
      - PROJECT_NAME=My Docker Compose Project
      - PROJECT_DESCRIPTION=A project initialized with Docker Compose
      - USE_OLLAMA=true
      - OLLAMA_HOST=http://host.docker.internal:11434
      - OLLAMA_MODEL=qwen3
    extra_hosts:
      - "host.docker.internal:host-gateway"
    command: /bin/bash -c "chmod +x /app/examples/bootstrap_container.sh && /app/examples/bootstrap_container.sh"
```

## Troubleshooting

### Ollama Connectivity

If you're running in Docker and connecting to Ollama on the host machine:

1. Use `http://host.docker.internal:11434` as the `OLLAMA_HOST` value
2. Add `--add-host=host.docker.internal:host-gateway` to your Docker run command
3. For Linux hosts, you may need to use the host's IP address instead of `host.docker.internal`

### File Permissions

If you encounter permission issues:

1. Make sure the mounted volumes have appropriate permissions
2. Run the container with the appropriate user ID using `--user $(id -u):$(id -g)`
