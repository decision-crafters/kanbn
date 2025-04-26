/**
 * Markdown parser compatibility layer
 *
 * This module provides a consistent API for markdown parsing,
 * allowing us to switch between different markdown parsers.
 *
 * Currently implements markdown-it as a replacement for marked.
 */

const MarkdownIt = require('markdown-it');

// Create a default instance with GFM-like features
const md = new MarkdownIt({
  html: false,        // Disable HTML tags by default (safer)
  breaks: true,       // Convert \n to <br>
  linkify: true,      // Autoconvert URL-like text to links
  typographer: true   // Enable smartquotes and other typographic replacements
});

// Add GFM task lists support with better compatibility with marked
md.use(require('markdown-it-task-lists'), {
  enabled: true,
  label: true,
  labelAfter: false
});

/**
 * Parse markdown to HTML
 * @param {string} src - Markdown source
 * @param {object} options - Options (optional)
 * @returns {string} - HTML output
 */
function parse(src, options = {}) {
  return md.render(src);
}

/**
 * Parse inline markdown to HTML
 * @param {string} src - Markdown source
 * @param {object} options - Options (optional)
 * @returns {string} - HTML output
 */
function parseInline(src, options = {}) {
  return md.renderInline(src);
}

/**
 * Lexical analysis of markdown (tokenization)
 * @param {string} src - Markdown source
 * @param {object} options - Options (optional)
 * @returns {Array} - Array of tokens
 */
function lexer(src, options = {}) {
  // Handle empty or whitespace-only input
  if (!src || src.trim() === '') {
    return [];
  }

  try {
    // This is a simplified version that returns tokens in a format
    // similar to marked's lexer, but with markdown-it's structure
    const tokens = md.parse(src, {});

    // Process tokens to make them more compatible with marked's format
    return processTokens(tokens);
  } catch (error) {
    console.warn(`Warning: Error in markdown lexer: ${error.message}`);
    // Return an empty array on error
    return [];
  }
}

/**
 * Process markdown-it tokens to make them more compatible with marked's format
 * @param {Array} tokens - markdown-it tokens
 * @returns {Array} - Processed tokens
 */
function processTokens(tokens) {
  // Handle empty tokens array
  if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
    return [];
  }

  const result = [];
  let currentList = null;

  try {
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (!token) continue;

      // Handle lists specially to match marked's format
      if (token.type === 'bullet_list_open') {
        currentList = {
          type: 'list',
          raw: '',
          ordered: false,
          start: '',
          loose: false,
          items: []
        };
        result.push(currentList);
      }
      else if (token.type === 'ordered_list_open') {
        currentList = {
          type: 'list',
          raw: '',
          ordered: true,
          start: token.attrs && token.attrs.start ? token.attrs.start : 1,
          loose: false,
          items: []
        };
        result.push(currentList);
      }
    else if (token.type === 'list_item_open') {
      const item = {
        type: 'list_item',
        raw: '',
        task: false,
        checked: false,
        loose: false,
        text: '',
        tokens: [{
          type: 'text',
          raw: '',
          text: '',
          tokens: [{
            type: 'text',
            raw: '',
            text: ''
          }]
        }]
      };

      // Check if this is a task item
      if (token.classes && token.classes.includes('task-list-item')) {
        item.task = true;

        // Find the checkbox input to determine if it's checked
        for (let j = i + 1; j < tokens.length && tokens[j].type !== 'list_item_close'; j++) {
          if (tokens[j].type === 'inline' && tokens[j].children) {
            for (const child of tokens[j].children) {
              if (child.type === 'checkbox' && child.attrs && child.attrs.checked) {
                item.checked = true;
                break;
              }
            }
          }
        }
      }
      // Fallback to the old method for compatibility
      else if (i + 2 < tokens.length &&
          tokens[i + 1].type === 'paragraph_open' &&
          tokens[i + 2].type === 'inline') {
        if (tokens[i + 2].content.startsWith('[ ] ')) {
          item.task = true;
          item.checked = false;
          tokens[i + 2].content = tokens[i + 2].content.substring(4);
        }
        else if (tokens[i + 2].content.startsWith('[x] ')) {
          item.task = true;
          item.checked = true;
          tokens[i + 2].content = tokens[i + 2].content.substring(4);
        }
      }

      if (currentList) {
        currentList.items.push(item);
      }
    }
    else if (token.type === 'inline' &&
             i > 0 &&
             tokens[i - 1] && tokens[i - 1].type === 'paragraph_open' &&
             currentList &&
             currentList.items && currentList.items.length > 0) {
      try {
        // Add content to the current list item
        const currentItem = currentList.items[currentList.items.length - 1];
        currentItem.text = token.content || '';

        // Create a safe tokens structure
        currentItem.tokens = [{
          type: 'text',
          raw: token.content || '',
          text: token.content || '',
          tokens: [{
            type: 'text',
            raw: token.content || '',
            text: token.content || ''
          }]
        }];
      } catch (error) {
        console.warn(`Warning: Error processing inline token: ${error.message}`);
      }
    }
    else if (token.type === 'heading_open') {
      try {
        const level = parseInt(token.tag.substring(1));
        const inlineToken = i + 1 < tokens.length ? tokens[i + 1] : null;

        if (inlineToken && inlineToken.type === 'inline') {
          result.push({
            type: 'heading',
            raw: `${'#'.repeat(level)} ${inlineToken.content || ''}`,
            depth: level,
            text: inlineToken.content || '',
            tokens: [{
              type: 'text',
              raw: inlineToken.content || '',
              text: inlineToken.content || ''
            }]
          });

          // Skip the next two tokens (inline and heading_close)
          i += 2;
        }
      } catch (error) {
        console.warn(`Warning: Error processing heading token: ${error.message}`);
      }
    }
    else if (token.type === 'paragraph_open' &&
             !(i > 0 && tokens[i - 1] && tokens[i - 1].type === 'list_item_open')) {
      try {
        const inlineToken = i + 1 < tokens.length ? tokens[i + 1] : null;

        if (inlineToken && inlineToken.type === 'inline') {
          result.push({
            type: 'paragraph',
            raw: inlineToken.content || '',
            text: inlineToken.content || '',
            tokens: [{
              type: 'text',
              raw: inlineToken.content || '',
              text: inlineToken.content || ''
            }]
          });

          // Skip the next two tokens (inline and paragraph_close)
          i += 2;
        }
      } catch (error) {
        console.warn(`Warning: Error processing paragraph token: ${error.message}`);
      }
    }
  }
  } catch (error) {
    console.warn(`Warning: Error in processTokens: ${error.message}`);
  }

  return result;
}

module.exports = {
  parse,
  parseInline,
  lexer,

  // Expose the markdown-it instance for direct access if needed
  md
};
