# Kanbn Makefile
# Supports local and Docker-based development with Ollama integration

# Default target
.PHONY: all
all: check-env install

# Environment variables
NODE_VERSION ?= 18
OLLAMA_MODEL ?= llama3

# Docker-related variables
DOCKER_IMAGE = decision-crafters/kanbn
DOCKER_TAG = latest
DOCKER_CONTAINER = kanbn-dev
DOCKER_OLLAMA_NET = ollama-network

# Directories
SRC_DIR = ./src
BIN_DIR = ./bin
TEST_DIR = ./test
EXAMPLES_DIR = ./examples

# Detect OS for OS-specific commands
UNAME := $(shell uname)

#-------------------------------------------------------------------------------
# Local Development
#-------------------------------------------------------------------------------

.PHONY: clean
clean:
	@echo "Cleaning up..."
	rm -rf node_modules
	rm -rf package-lock.json
	rm -rf test-report.html
	rm -rf test-results.xml
	rm -rf coverage
	rm -rf .nyc_output
	@echo "Clean complete."

.PHONY: install
install:
	@echo "Installing dependencies..."
	npm install
	@echo "Installation complete."

.PHONY: test
test:
	@echo "Running tests..."
	npm test
	@echo "Tests complete."

.PHONY: test-all
test-all:
	@echo "Running all tests..."
	npm run test:all
	@echo "All tests complete."

.PHONY: link
link:
	@echo "Linking kanbn globally..."
	npm link
	@echo "Linking complete. You can now use 'kanbn' command globally."

.PHONY: unlink
unlink:
	@echo "Unlinking kanbn globally..."
	npm unlink
	@echo "Unlinking complete."

#-------------------------------------------------------------------------------
# Ollama Integration
#-------------------------------------------------------------------------------

.PHONY: check-ollama
check-ollama:
	@echo "Checking for Ollama on the system..."
	@if command -v ollama >/dev/null 2>&1; then \
		echo "✅ Ollama found on the system."; \
		echo "Checking if model $(OLLAMA_MODEL) is available..."; \
		if ollama list | grep -q $(OLLAMA_MODEL); then \
			echo "✅ $(OLLAMA_MODEL) model is installed."; \
		else \
			echo "⚠️ $(OLLAMA_MODEL) model not found. Let's pull it..."; \
			ollama pull $(OLLAMA_MODEL); \
		fi; \
	else \
		echo "⚠️ Ollama not found. Visit https://ollama.com/download for installation."; \
		echo "You can still use Kanbn with OpenRouter or other AI providers."; \
	fi

.PHONY: start-ollama
start-ollama:
	@echo "Starting Ollama service..."
	@if command -v ollama >/dev/null 2>&1; then \
		if pgrep -x "ollama" > /dev/null; then \
			echo "✅ Ollama is already running."; \
		else \
			echo "Starting Ollama in the background..."; \
			ollama serve > /dev/null 2>&1 & \
			sleep 2; \
			echo "✅ Ollama started successfully."; \
		fi; \
	else \
		echo "⚠️ Ollama not found. Cannot start service."; \
	fi

#-------------------------------------------------------------------------------
# Docker Support
#-------------------------------------------------------------------------------

.PHONY: build-docker
build-docker:
	@echo "Building Docker image $(DOCKER_IMAGE):$(DOCKER_TAG)..."
	docker build -t $(DOCKER_IMAGE):$(DOCKER_TAG) .
	@echo "Docker image built successfully."

.PHONY: docker-network
docker-network:
	@echo "Setting up Docker network for Ollama communication..."
	@if ! docker network ls | grep -q $(DOCKER_OLLAMA_NET); then \
		echo "Creating Docker network: $(DOCKER_OLLAMA_NET)"; \
		docker network create $(DOCKER_OLLAMA_NET); \
	else \
		echo "Docker network $(DOCKER_OLLAMA_NET) already exists."; \
	fi

.PHONY: run-docker
run-docker: docker-network
	@echo "Running kanbn in Docker container..."
	@if command -v ollama >/dev/null 2>&1 && pgrep -x "ollama" > /dev/null; then \
		echo "✅ Connecting to host Ollama instance..."; \
		docker run -it --rm \
			--name $(DOCKER_CONTAINER) \
			--network $(DOCKER_OLLAMA_NET) \
			-e OLLAMA_HOST=host.docker.internal \
			-e OLLAMA_MODEL=$(OLLAMA_MODEL) \
			-v $$(pwd):/app \
			$(DOCKER_IMAGE):$(DOCKER_TAG) bash; \
	else \
		echo "⚠️ Running without Ollama integration..."; \
		docker run -it --rm \
			--name $(DOCKER_CONTAINER) \
			-v $$(pwd):/app \
			$(DOCKER_IMAGE):$(DOCKER_TAG) bash; \
	fi

.PHONY: docker-test
docker-test:
	@echo "Running tests in Docker container..."
	docker run --rm \
		--name $(DOCKER_CONTAINER)-test \
		-v $$(pwd):/app \
		$(DOCKER_IMAGE):$(DOCKER_TAG) npm test

.PHONY: docker-test-all
docker-test-all:
	@echo "Running all tests in Docker container..."
	docker run --rm \
		--name $(DOCKER_CONTAINER)-test-all \
		-v $$(pwd):/app \
		$(DOCKER_IMAGE):$(DOCKER_TAG) npm run test:all

.PHONY: docker-test-rag
docker-test-rag: build-docker docker-network
	@echo "Running RAG integration tests in Docker container..."
	@echo "Creating Docker container with Ollama for embedding generation..."
	@docker run --rm \
		--name $(DOCKER_CONTAINER)-rag-test \
		--network $(DOCKER_OLLAMA_NET) \
		-e DEBUG=true \
		-e KANBN_ENV=test \
		-v $$(pwd):/app \
		$(DOCKER_IMAGE):$(DOCKER_TAG) /bin/bash -c \
		"cd /app && ./examples/test_docker_rag_integrations.sh"
	@echo "RAG integration tests completed."

#-------------------------------------------------------------------------------
# Environment Setup
#-------------------------------------------------------------------------------

.PHONY: check-env
check-env:
	@echo "Checking development environment..."
	@echo "Node version:"
	@node --version
	@echo "NPM version:"
	@npm --version
	@make check-ollama
	@echo "Environment check complete."

.PHONY: setup-env
setup-env: check-env
	@echo "Setting up development environment..."
	@if ! command -v node >/dev/null 2>&1; then \
		echo "⚠️ Node.js not found. Please install Node.js $(NODE_VERSION) or later."; \
		exit 1; \
	fi
	@echo "Creating .env file with default settings..."
	@if [ ! -f .env ]; then \
		echo "# Kanbn Environment Configuration" > .env; \
		echo "" >> .env; \
		echo "# AI Provider Settings" >> .env; \
		echo "# Uncomment and set the API key for the provider you want to use" >> .env; \
		echo "" >> .env; \
		echo "# OpenRouter (Default)" >> .env; \
		echo "# OPENROUTER_API_KEY=your_api_key_here" >> .env; \
		echo "# OPENROUTER_MODEL=google/gemma-3-4b-it:free" >> .env; \
		echo "" >> .env; \
		echo "# Ollama (Local AI)" >> .env; \
		echo "OLLAMA_HOST=http://localhost:11434" >> .env; \
		echo "OLLAMA_MODEL=$(OLLAMA_MODEL)" >> .env; \
		echo "" >> .env; \
		echo "# Development Settings" >> .env; \
		echo "# KANBN_ENV=development" >> .env; \
		echo "✅ .env file created successfully."; \
	else \
		echo "ℹ️ .env file already exists. Skipping creation."; \
	fi
	@make install
	@echo "✅ Development environment setup complete."

#-------------------------------------------------------------------------------
# Dockerfiles
#-------------------------------------------------------------------------------

# Create Dockerfile if it doesn't exist
Dockerfile:
	@echo "Creating Dockerfile..."
	@echo "FROM node:$(NODE_VERSION)-slim" > Dockerfile
	@echo "" >> Dockerfile
	@echo "WORKDIR /app" >> Dockerfile
	@echo "" >> Dockerfile
	@echo "# Install dependencies" >> Dockerfile
	@echo "COPY package*.json ./" >> Dockerfile
	@echo "RUN npm install" >> Dockerfile
	@echo "" >> Dockerfile
	@echo "# Copy source code" >> Dockerfile
	@echo "COPY . ." >> Dockerfile
	@echo "" >> Dockerfile
	@echo "# Create symbolic link for global access" >> Dockerfile
	@echo "RUN npm link" >> Dockerfile
	@echo "" >> Dockerfile
	@echo "# Set environment variables" >> Dockerfile
	@echo "ENV NODE_ENV=production" >> Dockerfile
	@echo "ENV OLLAMA_HOST=http://host.docker.internal:11434" >> Dockerfile
	@echo "ENV OLLAMA_MODEL=$(OLLAMA_MODEL)" >> Dockerfile
	@echo "" >> Dockerfile
	@echo "# Command to run when container starts" >> Dockerfile
	@echo "CMD [\"bash\"]" >> Dockerfile
	@echo "✅ Dockerfile created successfully."

# Create Docker Compose file if it doesn't exist
docker-compose.yml:
	@echo "Creating docker-compose.yml..."
	@echo "version: '3'" > docker-compose.yml
	@echo "" >> docker-compose.yml
	@echo "services:" >> docker-compose.yml
	@echo "  kanbn:" >> docker-compose.yml
	@echo "    build: ." >> docker-compose.yml
	@echo "    image: $(DOCKER_IMAGE):$(DOCKER_TAG)" >> docker-compose.yml
	@echo "    container_name: $(DOCKER_CONTAINER)" >> docker-compose.yml
	@echo "    volumes:" >> docker-compose.yml
	@echo "      - .:/app" >> docker-compose.yml
	@echo "    environment:" >> docker-compose.yml
	@echo "      - NODE_ENV=development" >> docker-compose.yml
	@echo "      - OLLAMA_HOST=http://ollama:11434" >> docker-compose.yml
	@echo "      - OLLAMA_MODEL=$(OLLAMA_MODEL)" >> docker-compose.yml
	@echo "    networks:" >> docker-compose.yml
	@echo "      - kanbn-network" >> docker-compose.yml
	@echo "" >> docker-compose.yml
	@echo "  ollama:" >> docker-compose.yml
	@echo "    image: ollama/ollama:latest" >> docker-compose.yml
	@echo "    container_name: kanbn-ollama" >> docker-compose.yml
	@echo "    volumes:" >> docker-compose.yml
	@echo "      - ollama-data:/root/.ollama" >> docker-compose.yml
	@echo "    ports:" >> docker-compose.yml
	@echo "      - \"11434:11434\"" >> docker-compose.yml
	@echo "    networks:" >> docker-compose.yml
	@echo "      - kanbn-network" >> docker-compose.yml
	@echo "" >> docker-compose.yml
	@echo "networks:" >> docker-compose.yml
	@echo "  kanbn-network:" >> docker-compose.yml
	@echo "    name: $(DOCKER_OLLAMA_NET)" >> docker-compose.yml
	@echo "" >> docker-compose.yml
	@echo "volumes:" >> docker-compose.yml
	@echo "  ollama-data:" >> docker-compose.yml
	@echo "✅ docker-compose.yml created successfully."

.PHONY: prepare-docker
prepare-docker: Dockerfile docker-compose.yml
	@echo "Docker configuration files prepared successfully."

#-------------------------------------------------------------------------------
# Help
#-------------------------------------------------------------------------------

.PHONY: help
help:
	@echo "Kanbn Makefile - Development and Build Targets"
	@echo ""
	@echo "Local Development:"
	@echo "  make                  - Check environment and install dependencies"
	@echo "  make install          - Install project dependencies"
	@echo "  make clean            - Clean up build artifacts and dependencies"
	@echo "  make test             - Run tests"
	@echo "  make test-all         - Run all tests, including AI integration tests"
	@echo "  make link             - Link kanbn globally for local development"
	@echo "  make unlink           - Unlink kanbn from global npm"
	@echo ""
	@echo "Ollama Integration:"
	@echo "  make check-ollama     - Check if Ollama is installed and model available"
	@echo "  make start-ollama     - Start Ollama service in the background"
	@echo ""
	@echo "Docker Support:"
	@echo "  make prepare-docker   - Create Dockerfile and docker-compose.yml"
	@echo "  make build-docker     - Build Docker image"
	@echo "  make run-docker       - Run kanbn in Docker with Ollama integration (if available)"
	@echo "  make docker-test      - Run tests in Docker container"
	@echo "  make docker-test-all  - Run all tests in Docker container"
	@echo ""
	@echo "Environment Setup:"
	@echo "  make check-env        - Check development environment"
	@echo "  make setup-env        - Set up development environment, create .env file"
	@echo ""
	@echo "Options:"
	@echo "  NODE_VERSION=18       - Specify Node.js version for Docker"
	@echo "  OLLAMA_MODEL=llama3   - Specify Ollama model to use"
	@echo ""
