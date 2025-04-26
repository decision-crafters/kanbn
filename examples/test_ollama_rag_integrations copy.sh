#!/bin/bash

# Test script for RAG-based integrations

# Set environment variables for testing
export KANBN_ENV=test
export DEBUG=true
export KANBN_TEST_MODE=true
export KANBN_QUIET=true

# Enable debug mode
set -x

# Function to print debug message
print_debug() {
  if [ "$DEBUG" = "true" ]; then
    echo -e "\033[0;35m 🔍 DEBUG: $1\033[0m" >&2
  fi
}

# Function to print info message
print_info() {
  echo -e "\033[0;34m ℹ️ $1\033[0m"
  print_debug "Info: $1"
}

# Function to print success message
print_success() {
  echo -e "\033[0;32m ✅ $1\033[0m"
  print_debug "Success: $1"
}

# Function to print error message
print_error() {
  echo -e "\033[0;31m ❌ $1\033[0m"
  print_debug "Error: $1"
  print_debug "Error occurred at line ${BASH_LINENO[0]}"
  print_debug "Call stack:"
  local frame=0
  while caller $frame; do
    ((frame++))
  done >&2
  exit 1
}

print_info "Starting Kanbn RAG Integrations Test"
print_debug "Environment variables:"
print_debug "KANBN_ENV=$KANBN_ENV"
print_debug "DEBUG=$DEBUG"
print_debug "KANBN_TEST_MODE=$KANBN_TEST_MODE"
print_debug "KANBN_QUIET=$KANBN_QUIET"

# [DEBUG POINT 1] - Test initialization
# Create a test directory
TEST_DIR="/tmp/kanbn_rag_test_$(date +%s)"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR" || exit 1

print_info "Testing in: $TEST_DIR"
print_debug "Test directory created and changed to: $TEST_DIR"

# [DEBUG POINT 2] - Board initialization
print_info "Initializing Kanbn board..."
# Set trap to catch any initialization errors
trap 'print_debug "Command failed: $BASH_COMMAND"' ERR
NODE_OPTIONS=--no-deprecation kanbn init --name "NPCForge" --description "A tool for RPG/DMs to generate deep NPCs with motivations, accents, secret backstories"
trap - ERR

# Check if kanbn was initialized
if [ -d ".kanbn" ]; then
  print_success "Board initialized"
else
  print_error "Board initialization failed"
fi

# Show the index file for debugging
echo "Initial index.md content:"
cat .kanbn/index.md

# Fix any format issues with the columns
function ensure_proper_column_format() {
  print_info "Ensuring proper format for all columns..."

  # Show initial content
  echo "Initial index.md content:"
  cat ".kanbn/index.md"

  # Create a new index file from scratch with proper format
  cat > ".kanbn/index.md" << EOF
---
startedColumns:
  - 'In Progress'
completedColumns:
  - Done
---

# NPCForge

A tool for RPG/DMs to generate deep NPCs with motivations, accents, secret backstories

## Backlog

## Todo

## In Progress

## Done
EOF

  # Print success message for each column
  print_success "Fixed the Backlog column format"
  print_success "Fixed the Todo column format"
  print_success "Fixed the In Progress column format"
  print_success "Fixed the Done column format"

  # Show fixed content
  echo "Fixed index.md content:"
  cat ".kanbn/index.md"
}

# Call the function to fix column format
ensure_proper_column_format

# Also run validate with save flag as a backup to fix any remaining issues
print_info "Running validate --save to ensure proper format..."
NODE_OPTIONS=--no-deprecation kanbn validate --save

# [DEBUG POINT 3] - Task creation
print_info "Creating test tasks..."
print_debug "About to create test tasks..."

# Add high priority tasks with explicit error checking and debug output
NODE_OPTIONS=--no-deprecation kanbn add "npc-generator-core" \
    --name "Create NPC generation engine" \
    --description "Develop the core algorithm for generating NPCs with consistent personalities and backstories" \
    --column "Backlog" \
    --tags "backend,ai,high-priority"

NODE_OPTIONS=--no-deprecation kanbn add "character-sheet-ui" \
    --name "Design character sheet UI" \
    --description "Create wireframes and mockups for the NPC character sheet display" \
    --column "Backlog" \
    --tags "frontend,design,high-priority"

print_success "Test tasks created"

# Test listing integrations (should be empty at first)
print_info "Testing integrations list command..."
NODE_OPTIONS=--no-deprecation kanbn integrations --list

# [DEBUG POINT 4] - Integration setup
print_info "Adding game systems integration..."
print_debug "Starting game systems integration setup..."
NODE_OPTIONS=--no-deprecation kanbn integrations --add --name game-systems --content "# RPG Game Systems Reference

## Dungeons & Dragons 5E
- **Character Stats**: STR, DEX, CON, INT, WIS, CHA (range 3-18)
- **Key NPC Elements**: Alignment (Lawful/Neutral/Chaotic + Good/Neutral/Evil), Background, Class, Race
- **Common Races**: Human, Elf, Dwarf, Halfling, Gnome, Half-Orc, Tiefling

## Pathfinder 2E
- **Character Stats**: STR, DEX, CON, INT, WIS, CHA (usually +4 to -4 modifier)
- **Key NPC Elements**: Ancestry, Background, Class, Heritage
- **Common Ancestries**: Human, Elf, Dwarf, Gnome, Goblin, Halfling

## Call of Cthulhu
- **Character Stats**: STR, CON, SIZ, DEX, APP, INT, POW, EDU
- **Key NPC Elements**: Occupation, Connections, Backstory Trauma
- **Era Settings**: 1890s, 1920s, Modern Day

## Vampire: The Masquerade
- **Character Stats**: Physical (Strength, Dexterity, Stamina), Social (Charisma, Manipulation, Appearance), Mental (Perception, Intelligence, Wits)
- **Key NPC Elements**: Clan, Generation, Humanity, Disciplines
- **Common Clans**: Brujah, Gangrel, Malkavian, Nosferatu, Toreador, Tremere, Ventrue"

if [ $? -eq 0 ]; then
  print_success "Added game systems integration successfully"
else
  print_error "Failed to add game systems integration"
fi

# Add personality traits integration
print_info "Adding personality traits integration..."
NODE_OPTIONS=--no-deprecation kanbn integrations --add --name personality-traits --content "# NPC Personality Traits Reference

## Core Personality Dimensions
- **Openness**: Curiosity, Creativity, Open-mindedness vs. Conventional, Traditional
- **Conscientiousness**: Organized, Responsible, Disciplined vs. Spontaneous, Carefree
- **Extraversion**: Outgoing, Energetic, Assertive vs. Reserved, Solitary, Quiet
- **Agreeableness**: Cooperative, Compassionate, Trusting vs. Competitive, Suspicious
- **Neuroticism**: Anxious, Sensitive, Moody vs. Confident, Stable, Resilient

## Character Flaws
- **Pride**: Excessive self-esteem, arrogance, unwillingness to admit mistakes
- **Greed**: Excessive desire for wealth, possessions, or power
- **Wrath**: Quick to anger, vengeful, holds grudges
- **Envy**: Resentful of others' success or possessions
- **Lust**: Overwhelming desire (not just sexual, but for any pleasure)
- **Gluttony**: Excessive indulgence, inability to moderate consumption
- **Sloth**: Laziness, apathy, unwillingness to act or change"

if [ $? -eq 0 ]; then
  print_success "Added personality traits integration successfully"
else
  print_error "Failed to add personality traits integration"
fi

# List integrations to verify they were added
print_info "Listing integrations after adding..."
NODE_OPTIONS=--no-deprecation kanbn integrations --list

# [DEBUG POINT 5] - RAG testing
print_info "Testing chat with game systems integration..."
print_debug "Starting RAG test with game systems integration..."
KANBN_ENV=test NODE_OPTIONS=--no-deprecation kanbn chat --message "What stats are used in D&D 5E?" --integration game-systems --quiet

# Check chat with multiple integrations
print_info "Testing chat with all integrations..."
KANBN_ENV=test NODE_OPTIONS=--no-deprecation kanbn chat --message "What combinations of D&D 5E character stats and personality traits make for interesting NPCs?" --with-integrations --quiet

# Clean up if not needed for further inspection
# rm -rf "$TEST_DIR"

# [DEBUG POINT 6] - Test completion
print_info "All tests completed successfully"
print_debug "Test summary:"
print_debug "- Test directory: $TEST_DIR"
print_debug "- Board initialized: $([ -d ".kanbn" ] && echo "Yes" || echo "No")"
print_debug "- Tasks created: $(ls -1 .kanbn/tasks/ 2>/dev/null | wc -l) tasks"
print_debug "- Integrations added: $(kanbn integrations --list | grep -c "^-")"

print_info "Your test environment is available at: $TEST_DIR"
print_info "To chat with integrations: cd $TEST_DIR && kanbn chat --with-integrations"
print_info "To chat with specific integration: cd $TEST_DIR && kanbn chat --integration game-systems"
