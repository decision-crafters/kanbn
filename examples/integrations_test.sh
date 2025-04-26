#!/bin/bash

# Test script specifically for the integrations functionality

# Function to print success message
print_success() {
  echo -e "\033[32m✅ $1\033[0m"
}

# Function to print error message
print_error() {
  echo -e "\033[31m❌ $1\033[0m"
  exit 1
}

# Function to print info message
print_info() {
  echo -e "\033[34mℹ️ $1\033[0m"
}

print_info "Starting Kanbn Integrations Test"

# Create a test directory
TEST_DIR="/tmp/kanbn_integrations_test_$(date +%s)"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR" || exit 1

print_info "Testing in: $TEST_DIR"

# Initialize a Kanbn board
print_info "Initializing Kanbn board..."
NODE_OPTIONS=--no-deprecation kanbn init --name "Test Board" --description "Testing integrations" --no-prompts || print_error "Failed to initialize board"
print_success "Board initialized"

# Test integrations list command - should show default GitHub integration
print_info "Testing integrations list command..."
NODE_OPTIONS=--no-deprecation kanbn integrations --list
if [ $? -eq 0 ]; then
  print_success "Integrations list command works"
else
  print_error "Integrations list command failed"
fi

# Test adding a custom integration with content
print_info "Testing adding custom API integration..."
NODE_OPTIONS=--no-deprecation kanbn integrations --add --name api-spec --content "# API Specification

This is a sample API specification for our car lot inventory system.

## Endpoints

- GET /vehicles - List all vehicles
- POST /vehicles - Add a new vehicle
- GET /customers - List all customers
- POST /sales - Record a new sale"

if [ $? -eq 0 ]; then
  print_success "Added custom API integration successfully"
else
  print_error "Failed to add custom API integration"
fi

# List integrations again to verify the new one is added
print_info "Listing integrations after adding custom one..."
NODE_OPTIONS=--no-deprecation kanbn integrations --list

# Test adding an integration from URL
print_info "Testing adding integration from URL..."
NODE_OPTIONS=--no-deprecation kanbn integrations --add --name github-readme --url "https://raw.githubusercontent.com/decision-crafters/mcp-cli/refs/heads/main/README.md"
if [ $? -eq 0 ]; then
  print_success "Added GitHub README integration from URL successfully"
else
  print_error "Failed to add GitHub README integration from URL"
fi

# List integrations again to verify the URL-based one is added
print_info "Listing integrations after adding URL-based one..."
NODE_OPTIONS=--no-deprecation kanbn integrations --list

# Test removing an integration
print_info "Testing removing an integration..."
NODE_OPTIONS=--no-deprecation kanbn integrations --remove --name api-spec
if [ $? -eq 0 ]; then
  print_success "Removed integration successfully"
else
  print_error "Failed to remove integration"
fi

# List integrations again to verify the removal
print_info "Listing integrations after removal..."
NODE_OPTIONS=--no-deprecation kanbn integrations --list

print_success "All integrations tests completed successfully"
print_info "Your test environment is available at: $TEST_DIR"
print_info "To chat with integrations: cd $TEST_DIR && kanbn chat --with-integrations"
print_info "To chat with specific integration: cd $TEST_DIR && kanbn chat --integration github-readme"
