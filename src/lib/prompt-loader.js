/**
 * Prompt Loader for Kanbn
 * Handles loading custom or default prompts for AI-powered initialization
 */

const fs = require('fs');
const path = require('path');
const util = require('util');

const readFile = util.promisify(fs.readFile);
const readdir = util.promisify(fs.readdir);

class PromptLoader {
  /**
   * Create a new PromptLoader
   * @param {string} kanbnFolder The path to the .kanbn folder
   */
  constructor(kanbnFolder) {
    this.kanbnFolder = kanbnFolder;
    this.customPromptsFolder = path.join(kanbnFolder, 'init-prompts');
    this.defaultPromptsFolder = path.join(__dirname, '..', 'data', 'default-init-prompts');
  }

  /**
   * Load a prompt by name
   * @param {string} promptName The name of the prompt to load
   * @returns {Promise<string>} The prompt content
   */
  async loadPrompt(promptName) {
    // First, try to load from custom prompts
    try {
      const customPromptPath = path.join(this.customPromptsFolder, `${promptName}.md`);
      if (fs.existsSync(customPromptPath)) {
        return await readFile(customPromptPath, 'utf8');
      }
    } catch (error) {
      console.error(`Error loading custom prompt ${promptName}:`, error);
    }

    // Fall back to default prompts
    try {
      const defaultPromptPath = path.join(this.defaultPromptsFolder, `${promptName}.md`);
      if (fs.existsSync(defaultPromptPath)) {
        return await readFile(defaultPromptPath, 'utf8');
      }
    } catch (error) {
      console.error(`Error loading default prompt ${promptName}:`, error);
    }

    // If no prompt is found, return a generic prompt
    return `Please provide information about ${promptName.replace(/-/g, ' ')}.`;
  }

  /**
   * Get a list of available prompts
   * @returns {Promise<string[]>} Array of prompt names (without extension)
   */
  async listPrompts() {
    const prompts = new Set();

    // Get default prompts
    try {
      if (fs.existsSync(this.defaultPromptsFolder)) {
        const defaultPrompts = await readdir(this.defaultPromptsFolder);
        defaultPrompts
          .filter(file => file.endsWith('.md'))
          .forEach(file => prompts.add(file.replace('.md', '')));
      }
    } catch (error) {
      console.error('Error listing default prompts:', error);
    }

    // Get custom prompts
    try {
      if (fs.existsSync(this.customPromptsFolder)) {
        const customPrompts = await readdir(this.customPromptsFolder);
        customPrompts
          .filter(file => file.endsWith('.md'))
          .forEach(file => prompts.add(file.replace('.md', '')));
      }
    } catch (error) {
      console.error('Error listing custom prompts:', error);
    }

    return Array.from(prompts);
  }

  /**
   * Check if a prompt exists
   * @param {string} promptName The name of the prompt to check
   * @returns {Promise<boolean>} True if the prompt exists
   */
  async promptExists(promptName) {
    // Check custom prompts
    const customPromptPath = path.join(this.customPromptsFolder, `${promptName}.md`);
    if (fs.existsSync(customPromptPath)) {
      return true;
    }

    // Check default prompts
    const defaultPromptPath = path.join(this.defaultPromptsFolder, `${promptName}.md`);
    if (fs.existsSync(defaultPromptPath)) {
      return true;
    }

    return false;
  }
}

module.exports = PromptLoader;
