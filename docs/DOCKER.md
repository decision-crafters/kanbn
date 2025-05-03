# Using Kanbn in podman Containers

This document explains how to use Kanbn in podman containers and other containerized environments.

## Basic Usage

```bash
# Pull the latest container image
podman pull quay.io/takinosh/kanbn:latest

# Run Kanbn commands using the container
podman run -it --rm \
  -v $(pwd):/workspace \
  -e OPENROUTER_API_KEY=$OPENROUTER_API_KEY \
  quay.io/takinosh/kanbn:latest kanbn <command>

# For example, to initialize a new board:
podman run -it --rm \
  -v $(pwd):/workspace \
  quay.io/takinosh/kanbn:latest kanbn init

# Or to view your board:
podman run -it --rm \
  -v $(pwd):/workspace \
  quay.io/takinosh/kanbn:latest kanbn board
```

The container mounts your current directory as `/workspace`, allowing Kanbn to manage tasks in your local project.

## Using Ollama with Kanbn in podman

As of v0.14.0, Kanbn has improved support for connecting to Ollama from within podman containers:

```bash
# Run Kanbn with Ollama (running on the host)
podman run -it --rm \
  -v $(pwd):/workspace \
  -e USE_OLLAMA=true \
  -e OLLAMA_HOST=http://host.podman.internal:11434 \
  -e OLLAMA_MODEL=qwen3 \
  --add-host=host.podman.internal:host-gateway \
  quay.io/takinosh/kanbn:latest kanbn chat
```

## Container Bootstrap Script

For more advanced container usage, Kanbn provides a `bootstrap_container.sh` script that can initialize a complete Kanbn environment in a container.

### Basic Bootstrap Usage

```bash
podman run --rm -v $(pwd):/workspace -w /workspace \
  -e PROJECT_NAME="My Container Project" \
  -e USE_OLLAMA=true \
  -e OLLAMA_HOST=http://host.podman.internal:11434 \
  --add-host=host.podman.internal:host-gateway \
  quay.io/takinosh/kanbn:latest ./examples/bootstrap_container.sh
```

### Project Modes

The bootstrap script supports three project modes:

#### Mode 1: Clone and set up a new GitHub repository

```bash
podman run --rm -v $(pwd):/workspace -w /workspace \
  -e PROJECT_MODE=1 \
  -e GITHUB_REPO_URL=https://github.com/tosin2013/sno-quickstarts.git \
  -e USE_OLLAMA=true \
  -e OLLAMA_HOST=http://host.podman.internal:11434 \
  --add-host=host.podman.internal:host-gateway \
  quay.io/takinosh/kanbn:latest ./examples/bootstrap_container.sh
```

#### Mode 2: Work with an existing local repository

```bash
podman run -it --rm --network=host -v $(pwd):/workspace:Z -w /workspace -e USE_OLLAMA=true -e OLLAMA_HOST=http://localhost:11434 quay.io/takinosh/kanbn:latest examples/bootstrap_container.sh
```

#### Mode 3: Initialize a new project in the current directory (default)

```bash
podman run --rm -v $(pwd):/workspace -w /workspace \
  -e PROJECT_MODE=3 \
  -e USE_OLLAMA=true \
  -e OLLAMA_HOST=http://host.podman.internal:11434 \
  --add-host=host.podman.internal:host-gateway \
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

## Using with podman Compose

```yaml
version: '3'
services:
  kanbn-init:
    image: quay.io/takinosh/kanbn:latest
    volumes:
      - ./:/workspace
    environment:
      - PROJECT_NAME=My podman Compose Project
      - PROJECT_DESCRIPTION=A project initialized with podman Compose
      - USE_OLLAMA=true
      - OLLAMA_HOST=http://host.podman.internal:11434
      - OLLAMA_MODEL=qwen3
    extra_hosts:
      - "host.podman.internal:host-gateway"
    command: /bin/bash -c "chmod +x /app/examples/bootstrap_container.sh && /app/examples/bootstrap_container.sh"
```

## Troubleshooting

### Ollama Connectivity

If you're running in podman and connecting to Ollama on the host machine:

1. Use `http://host.podman.internal:11434` as the `OLLAMA_HOST` value
2. Add `--add-host=host.podman.internal:host-gateway` to your podman run command
3. For Linux hosts, you may need to use the host's IP address instead of `host.podman.internal`

### File Permissions

If you encounter permission issues:

1. Make sure the mounted volumes have appropriate permissions
2. Run the container with the appropriate user ID using `--user $(id -u):$(id -g)`

# Using Kanbn with Podman

This section explains how to use Kanbn with Podman, which is often used as a daemonless alternative to podman, especially on systems like RHEL, Fedora, and CentOS. The commands are very similar to podman.

## Basic Usage

```bash
# Pull the latest container image (Podman can use podman Hub images)
podman pull quay.io/takinosh/kanbn:latest

# Run Kanbn commands using the container
podman run -it --rm \
  -v $(pwd):/workspace:Z \
  -e OPENROUTER_API_KEY=$OPENROUTER_API_KEY \
  quay.io/takinosh/kanbn:latest kanbn <command>

# For example, to initialize a new board:
podman run -it --rm \
  -v $(pwd):/workspace:Z \
  quay.io/takinosh/kanbn:latest kanbn init

# Or to view your board:
podman run -it --rm \
  -v $(pwd):/workspace:Z \
  quay.io/takinosh/kanbn:latest kanbn board
```

Note the `:Z` flag on the volume mount (`-v $(pwd):/workspace:Z`). This is often necessary when using Podman on SELinux-enabled systems (like RHEL) to adjust the SELinux context of the mounted directory, allowing the container to write to it.

## Using Ollama with Kanbn in Podman

Connecting to an Ollama instance running on the host machine from a Podman container:

```bash
# Run Kanbn with Ollama (running on the host)
# Podman's default network often allows reaching localhost on the host
podman run -it --rm \
  -v $(pwd):/workspace:Z \
  -e USE_OLLAMA=true \
  -e OLLAMA_HOST=http://localhost:11434 \
  -e OLLAMA_MODEL=qwen3 \
  quay.io/takinosh/kanbn:latest kanbn chat
```

If `localhost` doesn't resolve correctly, you might need to use `--network=host`:

```bash
# Alternative: Use host networking
podman run -it --rm \
  --network=host \
  -v $(pwd):/workspace:Z \
  -e USE_OLLAMA=true \
  -e OLLAMA_HOST=http://localhost:11434 \
  -e OLLAMA_MODEL=qwen3 \
  quay.io/takinosh/kanbn:latest kanbn chat
```

Using `--network=host` gives the container direct access to the host's network interfaces, which is less isolated but often simpler for accessing host services.

## Container Bootstrap Script with Podman

The `bootstrap_container.sh` script can also be used with Podman.

### Basic Bootstrap Usage

```bash
podman run --rm -v $(pwd):/workspace:Z -w /workspace \
  -e PROJECT_NAME="My Podman Project" \
  -e USE_OLLAMA=true \
  -e OLLAMA_HOST=http://localhost:11434 \
  quay.io/takinosh/kanbn:latest ./examples/bootstrap_container.sh
```

### Project Modes

The project modes work similarly to podman.

#### Mode 1: Clone and set up a new GitHub repository

```bash
podman run --rm -v $(pwd):/workspace:Z -w /workspace \
  -e PROJECT_MODE=1 \
  -e GITHUB_REPO_URL=https://github.com/tosin2013/sno-quickstarts.git \
  -e USE_OLLAMA=true \
  -e OLLAMA_HOST=http://localhost:11434 \
  quay.io/takinosh/kanbn:latest ./examples/bootstrap_container.sh
```

#### Mode 2: Work with an existing local repository

```bash
# Ensure the path exists relative to the host volume mount
podman run --rm -v $(pwd):/workspace:Z -w /workspace \
  -e PROJECT_MODE=2 \
  -e REPO_PATH=/workspace/my-existing-repo \
  -e USE_OLLAMA=true \
  -e OLLAMA_HOST=http://localhost:11434 \
  quay.io/takinosh/kanbn:latest ./examples/bootstrap_container.sh
```

#### Mode 3: Initialize a new project in the current directory (default)

```bash
podman run --rm -v $(pwd):/workspace:Z -w /workspace \
  -e PROJECT_MODE=3 \
  -e USE_OLLAMA=true \
  -e OLLAMA_HOST=http://localhost:11434 \
  quay.io/takinosh/kanbn:latest ./examples/bootstrap_container.sh
```

## Environment Variables

The same environment variables used for podman configuration apply when using Podman. Refer to the [Environment Variables](#environment-variables) section above.

## Using with Podman Compose or Quadlets

Instead of podman Compose, you can use `podman-compose` (a separate tool implementing the Compose specification) or Podman's native Quadlet files for defining multi-container applications or services.

Example using `podman-compose` (requires `podman-compose` installation):

Create a `compose.yaml` or `podman-compose.yml`:

```yaml
version: '3'
services:
  kanbn-init:
    image: quay.io/takinosh/kanbn:latest
    volumes:
      - ./:/workspace:Z # Add :Z for SELinux
    environment:
      - PROJECT_NAME=My Podman Compose Project
      - PROJECT_DESCRIPTION=A project initialized with Podman Compose
      - USE_OLLAMA=true
      - OLLAMA_HOST=http://localhost:11434 # Assuming Ollama runs on host
      - OLLAMA_MODEL=qwen3
    # network_mode: host # Uncomment if localhost doesn't work by default
    command: /bin/bash -c "chmod +x /app/examples/bootstrap_container.sh && /app/examples/bootstrap_container.sh"
```

Run with: `podman-compose up`

## Troubleshooting (Podman Specific)

### SELinux Permissions

On SELinux-enabled systems (RHEL, Fedora, CentOS), containers might be blocked from accessing mounted volumes.
*   **Solution:** Append `:Z` or `:z` to your volume mounts (`-v host-path:container-path:Z`). `:Z` assigns a private, unshared label, while `:z` assigns a shared label. Use `:Z` unless you specifically need multiple containers to share the volume's SELinux context.

### Ollama Connectivity

*   If `localhost:11434` is not reachable from the container, try using `--network=host`.
*   Ensure Ollama on the host is configured to listen on `0.0.0.0` or the specific host IP if not using `--network=host`. Check Ollama's configuration (`OLLAMA_HOSTS` environment variable or service configuration).

### Rootless Podman and Ports

*   Rootless Podman containers cannot bind to privileged ports (below 1024) without specific capabilities. This usually doesn't affect Kanbn connecting *out* to Ollama.
*   Networking between rootless containers might require specific Podman network configurations if not using `--network=host`.
