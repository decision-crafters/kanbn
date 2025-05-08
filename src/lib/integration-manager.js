/**
 * Integration Manager
 *
 * Manages integration markdown files for enhancing AI context
 */

const fs = require('fs');
const path = require('path');
const util = require('util');
const axios = require('axios');
const utility = require('../utility');

// Convert fs functions to promise-based
const mkdir = util.promisify(fs.mkdir);
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const readdir = util.promisify(fs.readdir);
const unlink = util.promisify(fs.unlink);
const access = util.promisify(fs.access);

class IntegrationManager {
  /**
   * Create a new IntegrationManager
   * @param {string} projectRoot Path to the project root
   */
  constructor(projectRoot) {
    this.projectRoot = projectRoot || process.cwd();
    this.integrationDir = path.join(this.projectRoot, '.kanbn', 'integrations');
  }

  /**
   * Initialize the integrations directory
   * @returns {Promise<boolean>} Whether initialization was successful
   */
  async initIntegrationsDirectory() {
    try {
      // Check if .kanbn directory exists
      const kanbnDir = path.join(this.projectRoot, '.kanbn');
      try {
        await access(kanbnDir, fs.constants.F_OK);
      } catch (error) {
        // If .kanbn doesn't exist, create it
        await mkdir(kanbnDir, { recursive: true });
      }

      // Check if integrations directory exists
      try {
        await access(this.integrationDir, fs.constants.F_OK);
        utility.debugLog(`Integrations directory already exists: ${this.integrationDir}`);
      } catch (error) {
        // If integrations directory doesn't exist, create it
        await mkdir(this.integrationDir, { recursive: true });
        utility.debugLog(`Created integrations directory: ${this.integrationDir}`);

        // Add README.md (GitHub's one as default) for new integrations directory
        try {
          const readmeUrl = 'https://raw.githubusercontent.com/decision-crafters/mcp-cli/refs/heads/main/README.md';
          const response = await axios.get(readmeUrl);
          await writeFile(path.join(this.integrationDir, 'github.md'), response.data);
          utility.debugLog('Added default GitHub integration file');
        } catch (readmeError) {
          utility.debugLog(`Failed to add default integration file: ${readmeError.message}`);
          // Create a simple README if we couldn't fetch from GitHub
          const defaultContent = '# Default Integration\n\nThis is a default integration file. Replace it with your own integrations.';
          await writeFile(path.join(this.integrationDir, 'default.md'), defaultContent);
        }
      }

      return true;
    } catch (error) {
      utility.debugLog(`Error initializing integrations directory: ${error.message}`);
      return false;
    }
  }

  /**
   * List all integration files
   * @returns {Promise<Array>} List of integration files
   */
  async listIntegrations() {
    try {
      await this.initIntegrationsDirectory();
      const files = await readdir(this.integrationDir);
      return files
        .filter((file) => file.endsWith('.md'))
        .map((file) => ({
          id: path.basename(file, '.md'),
          file,
          path: path.join(this.integrationDir, file),
        }));
    } catch (error) {
      utility.debugLog(`Error listing integrations: ${error.message}`);
      return [];
    }
  }

  /**
   * Add an integration from a URL
   * @param {string} name Name for the integration
   * @param {string} url URL to the integration content
   * @returns {Promise<boolean>} Whether the addition was successful
   */
  async addIntegrationFromUrl(name, url) {
    try {
      await this.initIntegrationsDirectory();

      // Validate URL
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        throw new Error('URL must start with http:// or https://');
      }

      // Download content from URL
      const response = await axios.get(url);

      // Create safe filename from name
      const safeFileName = this.createSafeFileName(name);
      const filePath = path.join(this.integrationDir, `${safeFileName}.md`);

      // Write content to file
      await writeFile(filePath, response.data);
      utility.debugLog(`Added integration from URL: ${url} as ${safeFileName}.md`);

      return true;
    } catch (error) {
      utility.debugLog(`Error adding integration from URL: ${error.message}`);
      return false;
    }
  }

  /**
   * Add an integration from local content
   * @param {string} name Name for the integration
   * @param {string} content Content of the integration
   * @returns {Promise<boolean>} Whether the addition was successful
   */
  async addIntegrationFromContent(name, content) {
    try {
      await this.initIntegrationsDirectory();

      // Create safe filename from name
      const safeFileName = this.createSafeFileName(name);
      const filePath = path.join(this.integrationDir, `${safeFileName}.md`);

      // Write content to file
      await writeFile(filePath, content);
      utility.debugLog(`Added integration with content as ${safeFileName}.md`);

      return true;
    } catch (error) {
      utility.debugLog(`Error adding integration from content: ${error.message}`);
      return false;
    }
  }

  /**
   * Remove an integration
   * @param {string} name Name of the integration to remove
   * @returns {Promise<boolean>} Whether the removal was successful
   */
  async removeIntegration(name) {
    try {
      // Check if integrations directory exists
      try {
        await access(this.integrationDir, fs.constants.F_OK);
      } catch (error) {
        utility.debugLog('Integrations directory does not exist');
        return false;
      }

      // Get all integration files
      const integrations = await this.listIntegrations();

      // Find matching integration(s) - case insensitive
      const matchingIntegrations = integrations.filter(
        (integration) => integration.id.toLowerCase() === name.toLowerCase(),
      );

      if (matchingIntegrations.length === 0) {
        utility.debugLog(`No integration found with name: ${name}`);
        return false;
      }

      // Remove all matching integrations
      for (const integration of matchingIntegrations) {
        await unlink(integration.path);
        utility.debugLog(`Removed integration: ${integration.file}`);
      }

      return true;
    } catch (error) {
      utility.debugLog(`Error removing integration: ${error.message}`);
      return false;
    }
  }

  /**
   * Read all integration contents
   * @param {Array} names Optional list of specific integration names to read
   * @returns {Promise<Object>} Integration contents by name
   */
  async readIntegrations(names = []) {
    try {
      const integrations = await this.listIntegrations();
      const result = {};

      // Filter integrations by name if specified
      const filteredIntegrations = names.length > 0
        ? integrations.filter((integration) => names.some((name) => integration.id.toLowerCase() === name.toLowerCase()))
        : integrations;

      // Read content of each integration
      for (const integration of filteredIntegrations) {
        try {
          const content = await readFile(integration.path, 'utf8');
          result[integration.id] = content;
        } catch (readError) {
          utility.debugLog(`Error reading integration ${integration.file}: ${readError.message}`);
          result[integration.id] = `Error reading integration: ${readError.message}`;
        }
      }

      return result;
    } catch (error) {
      utility.debugLog(`Error reading integrations: ${error.message}`);
      return {};
    }
  }

  /**
   * Create a safe filename from a name
   * @param {string} name Name to convert to safe filename
   * @returns {string} Safe filename
   */
  createSafeFileName(name) {
    // Remove file extension if present
    let safeName = name.replace(/\.[^/.]+$/, '');

    // Replace spaces and special characters with dashes
    safeName = safeName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Ensure filename is not empty
    if (!safeName) {
      safeName = 'integration';
    }

    return safeName;
  }
}

module.exports = IntegrationManager;
