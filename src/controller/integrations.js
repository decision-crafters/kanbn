/**
 * Kanbn Integrations Controller
 *
 * Manages integration markdown files for enhancing AI context
 */

const kanbnModule = require('../main');
const utility = require('../utility');
const chalk = require('chalk');
const path = require('path');
const RAGManager = require('../lib/rag-manager');

/**
 * Main integrations controller module
 * @param {Object} args Command arguments
 * @returns {Promise<string>} Command result
 */
module.exports = async args => {
  try {
    // Create a Kanbn instance
    const kanbn = typeof kanbnModule === 'function' ? kanbnModule() : kanbnModule;
    
    // Check if we're in a Kanbn board
    let boardFolder;
    try {
      boardFolder = await kanbn.findBoardFolder();
    } catch (error) {
      return 'Not in a Kanbn board. Initialize a board with `kanbn init` first.';
    }
    
    // Create RAG manager instance
    const ragManager = new RAGManager({paths: {kanbn: boardFolder}});
    
    // Initialize RAG manager and integrations directory
    await ragManager.initialize();
    
    // Handle different subcommands
    if (args.list) {
      // List all integrations
      const integrations = await ragManager.listIntegrations();
      
      if (integrations.length === 0) {
        return 'No integrations found. Add integrations with `kanbn integrations add <n> <url-or-content>`.';
      }
      
      let result = 'Available integrations:\n';
      for (const integration of integrations) {
        result += `- ${chalk.green(integration)}: ${chalk.gray(`${integration}.md`)}\n`;
      }
      
      return result;
    } else if (args.add) {
      // Add a new integration
      if (!args.name) {
        return 'Missing integration name. Usage: `kanbn integrations add --name <name> [--url <url>] [--content <content>]`';
      }
      
      if (args.url) {
        // Add integration from URL
        const success = await ragManager.addIntegrationFromUrl(args.name, args.url);
        
        if (success) {
          return `Integration '${args.name}' added successfully from URL: ${args.url}`;
        } else {
          return `Failed to add integration '${args.name}' from URL: ${args.url}`;
        }
      } else if (args.content) {
        // Add integration from content
        const success = await ragManager.addIntegration(args.name, args.content);
        
        if (success) {
          return `Integration '${args.name}' added successfully with provided content`;
        } else {
          return `Failed to add integration '${args.name}' with provided content`;
        }
      } else {
        return 'Missing URL or content. Usage: `kanbn integrations add --name <name> [--url <url>] [--content <content>]`';
      }
    } else if (args.remove) {
      // Remove an integration
      if (!args.name) {
        return 'Missing integration name. Usage: `kanbn integrations remove --name <name>`';
      }
      
      const success = await ragManager.removeIntegration(args.name);
      
      if (success) {
        return `Integration '${args.name}' removed successfully`;
      } else {
        return `Failed to remove integration '${args.name}'`;
      }
    } else {
      // Show help information by default
      return `
${chalk.bold('Kanbn Integrations Commands')}

Manage context integrations for AI assistance:

- ${chalk.yellow('kanbn integrations list')} - List all available integrations
- ${chalk.yellow('kanbn integrations add --name <name> --url <url>')} - Add integration from URL
- ${chalk.yellow('kanbn integrations add --name <name> --content <content>')} - Add integration with content
- ${chalk.yellow('kanbn integrations remove --name <name>')} - Remove an integration
- ${chalk.yellow('kanbn integrations --help')} - Show this help message

Use integrations with the chat command:
- ${chalk.yellow('kanbn chat --with-integrations')} - Use all integrations in the chat context
- ${chalk.yellow('kanbn chat --integration <name>')} - Use specific integration(s) by name
`;
    }
  } catch (error) {
    utility.error(`Error handling integrations: ${error.message}`, true);
    return `Error handling integrations: ${error.message}`;
  }
};
