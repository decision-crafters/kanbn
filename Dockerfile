FROM node:18-slim

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Install HTML-to-Markdown conversion dependencies
RUN npm install --save turndown cheerio

# Copy source code
COPY . .

# Create symbolic link for global access
RUN npm link

# Set environment variables
ENV NODE_ENV=production
# Connect to host's Ollama instance
ENV OLLAMA_HOST=http://host.docker.internal:11434
ENV OLLAMA_MODEL=llama3:latest
# Force use of Ollama
ENV USE_OLLAMA=true
ENV OPENROUTER_API_KEY=

# Command to run when container starts
CMD ["bash"]
