#!/bin/bash
set -e

# Enable debug mode to see environment variables
export DEBUG=true

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Use the centralized script to check the OpenRouter API key
"$SCRIPT_DIR/scripts/check-openrouter-key.sh"
