#!/bin/bash

# Check if docsify-cli is installed globally
if ! command -v docsify &> /dev/null; then
    echo "Installing docsify-cli globally..."
    npm install -g docsify-cli
fi

# Create scripts directory if it doesn't exist
mkdir -p scripts

# Start docsify development server
echo "Starting documentation server..."
echo "Open http://localhost:3000 in your browser"
docsify serve docs
