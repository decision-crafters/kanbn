#!/bin/bash

# Kanbn Environment Bootstrap Script

set -e # Exit immediately if a command exits with a non-zero status.

ECHO_PREFIX="[bootstrap_env]"

echo "$ECHO_PREFIX Starting environment bootstrap..."

# Check for Node.js and npm
if ! command -v node &> /dev/null
then
    echo "$ECHO_PREFIX Node.js could not be found. Please install Node.js."
    exit 1
fi
echo "$ECHO_PREFIX Found Node.js: $(node --version)"

if ! command -v npm &> /dev/null
then
    echo "$ECHO_PREFIX npm could not be found. Please install npm (usually comes with Node.js)."
    exit 1
fi
echo "$ECHO_PREFIX Found npm: $(npm --version)"

# Check for Git
if ! command -v git &> /dev/null
then
    echo "$ECHO_PREFIX Git could not be found. Please install Git."
    exit 1
fi
echo "$ECHO_PREFIX Found Git: $(git --version)"

# Create .env file from .env.example if .env does not exist
if [ ! -f ../.env ] && [ -f ../.env.example ]; then
    echo "$ECHO_PREFIX .env file not found in project root. Copying from ../.env.example..."
    cp ../.env.example ../.env
    echo "$ECHO_PREFIX ../.env file created. Please fill in your API keys and other environment variables."
elif [ -f ../.env ]; then
    echo "$ECHO_PREFIX ../.env file already exists in project root. Skipping creation."
else
    echo "$ECHO_PREFIX ../.env.example not found in project root. Cannot create .env. Please ensure ../.env.example is present."
fi

# Install npm dependencies in the project root
echo "$ECHO_PREFIX Installing npm dependencies in project root (../)..."
if (cd ../ && npm install); then
    echo "$ECHO_PREFIX npm dependencies installed successfully."
else
    echo "$ECHO_PREFIX Failed to install npm dependencies. Please check for errors."
    exit 1
fi

# (Optional) Prompt for API keys if not set - example for OPENROUTER_API_KEY
# You would need to source the .env file or parse it to check specific keys
# This is a simplified example that doesn't parse .env directly
# if grep -q "^OPENROUTER_API_KEY=$''" ../.env || ! grep -q "^OPENROUTER_API_KEY=" ../.env ; then
# echo "$ECHO_PREFIX Your OpenRouter API key is not set in ../.env."
# read -p "Enter your OpenRouter API key (or press Enter to skip): " api_key
# if [ -n "$api_key" ]; then
#     # This is a naive way to update .env; a more robust method would use sed or awk
#     # Or better, instruct the user to manually edit the ../.env file.
#     echo "$ECHO_PREFIX Note: Manual update of ../.env for API key is recommended for safety."
#     echo "$ECHO_PREFIX Please add/update OPENROUTER_API_KEY in your ../.env file."
# fi
# fi

echo "$ECHO_PREFIX Environment bootstrap completed."
echo "$ECHO_PREFIX IMPORTANT: If you copied ../.env.example, please ensure you have updated ../.env with your actual API keys and configuration."

exit 0
