# Build stage
FROM node:18-slim AS build

WORKDIR /build

# Copy package files for dependency installation
COPY package*.json ./

# Install all dependencies including dev dependencies
RUN npm ci

# Copy source code and prompts
COPY . .
COPY src/prompts/ /app/src/prompts/

# Ensure prompts directory exists and has correct permissions
RUN mkdir -p /app/src/prompts && chmod -R 755 /app/src/prompts

# If there's a build step, uncomment the next line
# RUN npm run build

# Install any additional packages needed for testing/building
RUN npm install --no-save turndown cheerio jq

# Production stage
FROM node:18-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    jq \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy source code and prompts from build stage
COPY --from=build /build .

# Create directories for epic functionality
RUN mkdir -p /app/src/prompts /app/tasks && \
    chmod -R 755 /app/src/prompts /app/tasks

# Create a proper wrapper script that ensures environment variables are passed correctly
RUN echo '#!/bin/bash' > /usr/local/bin/kanbn && \
    echo 'export DEBUG=${DEBUG:-true}' >> /usr/local/bin/kanbn && \
    echo 'export OPENROUTER_API_KEY=${OPENROUTER_API_KEY:-""}' >> /usr/local/bin/kanbn && \
    echo 'export OPENROUTER_MODEL=${OPENROUTER_MODEL:-"google/gemma-3-4b-it:free"}' >> /usr/local/bin/kanbn && \
    echo 'export USE_OLLAMA=${USE_OLLAMA:-false}' >> /usr/local/bin/kanbn && \
    echo 'env | grep -E "OPEN|OLLAMA|DEBUG" || true' >> /usr/local/bin/kanbn && \
    echo 'exec node /app/index.js "$@"' >> /usr/local/bin/kanbn && \
    chmod +x /usr/local/bin/kanbn

# Set environment variables
ENV NODE_ENV=production
# Connect to host's Ollama instance
ENV OLLAMA_HOST=http://host.docker.internal:11434
ENV OLLAMA_MODEL=
# Force use of Ollama by default, but allow override
ENV USE_OLLAMA=true
ENV OPENROUTER_API_KEY=
# Enable debugging by default to help diagnose issues
ENV DEBUG=true
# Epic functionality settings
ENV KANBN_PROMPTS_PATH=/app/src/prompts
ENV KANBN_TASKS_PATH=/app/tasks

# Command to run when container starts
CMD ["bash"]
