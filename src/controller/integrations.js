/**
 * Kanbn Integrations Controller
 *
 * Manages integration markdown files for enhancing AI context
 */

// Use dynamic import for main module to avoid circular dependency issues in container environments
// This is more compatible with various module systems and environments
const utility = require('../utility');
const chalk = require('chalk');
// Use a more compatible approach for terminal colors
const colors = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  gray: (text) => `\x1b[90m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
};
const path = require('path');
const RAGManager = require('../lib/rag-manager');

/**
 * Main integrations controller module
 * @param {Object} args Command arguments
 * @returns {Promise<string>} Command result
 */
module.exports = async (args) => {
  try {
    // Debug the args object to help diagnose issues
    if (process.env.DEBUG === 'true') {
      console.log('[DEBUG] Integrations controller args:', JSON.stringify(args));
    }

    // Fix for Docker container: Check if this is the 'list' command based on args._
    // This handles the case when args.list isn't properly set
    if (args._.includes('list') && !args.list) {
      args.list = true;
      if (process.env.DEBUG === 'true') {
        console.log('[DEBUG] Fixed args.list flag based on args._');
      }
    }

    // Use CommonJS require instead of ES module import to avoid compatibility issues
    const kanbnModule = require('../main');
    // Create a Kanbn instance
    const kanbn = typeof kanbnModule === 'function' ? kanbnModule() : kanbnModule;

    // Check if we're in a Kanbn board
    let boardFolder;
    try {
      // Check if kanbn has been initialised
      if (!await kanbn.initialised()) {
        return 'Not in a Kanbn board. Initialize a board with `kanbn init` first.';
      }

      // Get the main folder
      boardFolder = await kanbn.getMainFolder();
      if (process.env.DEBUG === 'true') {
        console.log(`[DEBUG] Board folder: ${boardFolder}`);
      }
    } catch (error) {
      console.error(`[ERROR] Failed to get board folder: ${error.message}`);
      return 'Not in a Kanbn board. Initialize a board with `kanbn init` first.';
    }

    // Create RAG manager instance
    const ragManager = new RAGManager({ paths: { kanbn: boardFolder } });

    // Initialize RAG manager and integrations directory
    await ragManager.initialize();

    // Handle different subcommands
    if (args.list) {
      // List all integrations
      const integrations = await ragManager.listIntegrations();

      if (integrations.length === 0) {
        const message = 'No integrations found. Add integrations with `kanbn integrations add <n> <url-or-content>`.';
        // Print directly to console to ensure visibility
        console.log(message);
        return message;
      }

      let result = 'Available integrations:\n';
      for (const integration of integrations) {
        result += `- ${colors.green(integration)}: ${colors.gray(`${integration}.md`)}\n`;
      }

      // Print directly to console to ensure visibility
      console.log(result);
      return result;
    } if (args.add) {
      // Add a new integration
      if (!args.name) {
        return 'Missing integration name. Usage: `kanbn integrations add --name <name> [--url <url>] [--content <content>]`';
      }

      if (args.url) {
        // Add integration from URL
        const { isLikelyHtmlUrl } = require('../utils/html-to-markdown');
        const isHtml = isLikelyHtmlUrl(args.url);

        // Inform the user if we're converting HTML to Markdown
        if (isHtml) {
          utility.debugLog(`URL appears to be an HTML webpage, will convert to Markdown: ${args.url}`);
        }

        const success = await ragManager.addIntegrationFromUrl(args.name, args.url);

        if (success) {
          if (isHtml) {
            // Print directly to console to ensure visibility
            console.log(`Integration '${args.name}' added successfully from URL: ${args.url} (HTML converted to Markdown)`);
            return `Integration '${args.name}' added successfully from URL: ${args.url} (HTML converted to Markdown)`;
          }
          // Print directly to console to ensure visibility
          console.log(`Integration '${args.name}' added successfully from URL: ${args.url}`);
          return `Integration '${args.name}' added successfully from URL: ${args.url}`;
        }
        // Print directly to console to ensure visibility
        console.error(`Failed to add integration '${args.name}' from URL: ${args.url}`);
        return `Failed to add integration '${args.name}' from URL: ${args.url}`;
      } if (args.content) {
        // Add integration from content
        const success = await ragManager.addIntegration(args.name, args.content);

        if (success) {
          // Print directly to console to ensure visibility
          console.log(`Integration '${args.name}' added successfully with provided content`);
          return `Integration '${args.name}' added successfully with provided content`;
        }
        // Print directly to console to ensure visibility
        console.error(`Failed to add integration '${args.name}' with provided content`);
        return `Failed to add integration '${args.name}' with provided content`;
      }
      return 'Missing URL or content. Usage: `kanbn integrations add --name <name> [--url <url>] [--content <content>]`';
    } if (args.remove) {
      // Remove an integration
      if (!args.name) {
        return 'Missing integration name. Usage: `kanbn integrations remove --name <name>`';
      }

      const success = await ragManager.removeIntegration(args.name);

      if (success) {
        // Print directly to console to ensure visibility
        console.log(`Integration '${args.name}' removed successfully`);
        return `Integration '${args.name}' removed successfully`;
      }
      // Print directly to console to ensure visibility
      console.error(`Failed to remove integration '${args.name}'`);
      return `Failed to remove integration '${args.name}'`;
    }
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
  } catch (error) {
    utility.error(`Error handling integrations: ${error.message}`, true);
    return `Error handling integrations: ${error.message}`;
  }
};
