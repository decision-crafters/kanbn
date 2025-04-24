# Kanbn Examples

This directory contains example scripts that demonstrate how to use Kanbn in various scenarios.

## Interactive Demo

The `interactive-demo.sh` script provides a comprehensive interactive demo of Kanbn's features, including:

- Initializing a new project with AI
- Setting up Kanbn in an existing repository
- Adding and managing tasks
- Using the AI chat feature

To run the interactive demo:

```bash
./interactive-demo.sh
```

## Project Bootstrap

The `bootstrap.sh` script helps you quickly set up a new Kanbn project board with AI assistance:

- Checks for Kanbn installation and Git repository
- Helps set up OpenRouter API key for AI features
- Creates a project board with AI-generated tasks based on project type
- Offers options for Web Application, Mobile App, Data Science, DevOps, API Development, Game Development, and Custom projects
- Provides guidance on next steps and available features
- Integrates with Git for version control

To bootstrap a new Kanbn project:

```bash
# Run from your project directory
curl -O https://raw.githubusercontent.com/decision-crafters/kanbn/main/examples/bootstrap.sh
chmod +x bootstrap.sh
./bootstrap.sh
```

Or if you've already cloned the repository:

```bash
./examples/bootstrap.sh
```

## GitHub Repository Initialization

The `github-repo-init.sh` script shows how to use Kanbn with an existing GitHub repository:

- Clone a GitHub repository
- Initialize Kanbn with AI in the repository
- View the generated board
- Commit the Kanbn board to the repository

To run the GitHub repository initialization:

```bash
./github-repo-init.sh
```

## Prerequisites

- Bash shell
- Git (for repository examples)
- Kanbn installed (`npm install -g kanbn`)
- OpenRouter API key (optional, for full AI experience)

## Setting up OpenRouter API Key

For the full AI experience, set your OpenRouter API key:

```bash
export OPENROUTER_API_KEY=your-api-key
```

If the API key is not set, the scripts will run in test mode with simulated AI responses.

## Cleanup

All example scripts create temporary directories that can be safely deleted after running the demos.
