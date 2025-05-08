const yaml = require('yamljs');
const fm = require('front-matter');
const { validate } = require('jsonschema');
const markdown = require('./lib/markdown');
const parseMarkdown = require('./parse-markdown');

/**
 * Validate the options object
 * @param {object} options
 */
function validateOptions(options) {
  const result = validate(options, {
    type: 'object',
    properties: {
      hiddenColumns: {
        type: 'array',
        items: { type: 'string' },
      },
      startedColumns: {
        type: 'array',
        items: { type: 'string' },
      },
      completedColumns: {
        type: 'array',
        items: { type: 'string' },
      },
      sprints: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            start: { type: 'date' },
            name: { type: 'string' },
            description: { type: 'string' },
          },
          required: ['start', 'name'],
        },
      },
      defaultTaskWorkload: { type: 'number' },
      taskWorkloadTags: {
        type: 'object',
        patternProperties: {
          '^[\w ]+$': { type: 'number' },
        },
      },
      columnSorting: {
        type: 'object',
        patternProperties: {
          '^[\w ]+$': {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string' },
                filter: { type: 'string' },
                order: {
                  type: 'string',
                  enum: [
                    'ascending',
                    'descending',
                  ],
                },
              },
              required: ['field'],
            },
          },
        },
      },
      taskTemplate: { type: 'string' },
      dateFormat: { type: 'string' },
      customFields: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            type: {
              type: 'string',
              enum: [
                'boolean',
                'string',
                'number',
                'date',
              ],
            },
            updateDate: {
              type: 'string',
              enum: [
                'always',
                'once',
                'none',
              ],
            },
          },
          required: ['name', 'type'],
        },
      },
      views: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            filters: { type: 'object' },
            columns: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  filters: { type: 'object' },
                  sorters: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        field: { type: 'string' },
                        filter: { type: 'string' },
                        order: {
                          type: 'string',
                          enum: [
                            'ascending',
                            'descending',
                          ],
                        },
                      },
                      required: ['field'],
                    },
                  },
                },
                required: ['name'],
              },
              minItems: 1,
            },
            lanes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  filters: { type: 'object' },
                },
                required: ['name'],
              },
            },
          },
          required: ['name'],
        },
      },
    },
  });
  if (result.errors.length) {
    throw new Error(result.errors.map((error) => `\n${error.property} ${error.message}`).join(''));
  }
}

/**
 * Validate the columns object
 * @param {object} columns
 */
function validateColumns(columns) {
  const result = validate(columns, {
    type: 'object',
    patternProperties: {
      '^[\w ]+$': {
        type: 'array',
        items: { type: 'string' },
      },
    },
  });
  if (result.errors.length) {
    throw new Error(result.errors.map((error) => `${error.property} ${error.message}`).join('\n'));
  }
}

module.exports = {

  /**
   * Convert markdown into an index object
   * @param {string} data
   * @return {object}
   */
  md2json(data) {
    let name = ''; let description = ''; let options = {}; let
      columns = {};
    try {
      // Check data type
      if (!data) {
        throw new Error('data is null or empty');
      }
      if (typeof data !== 'string') {
        throw new Error('data is not a string');
      }

      // Get YAML front matter if any exists
      if (fm.test(data)) {
        ({ attributes: options, body: data } = fm(data));

        // Make sure the front matter contains an object
        if (typeof options !== 'object') {
          throw new Error('invalid front matter content');
        }
      }

      // Parse markdown to an object
      let index = null;
      try {
        index = parseMarkdown(data);
      } catch (error) {
        throw new Error(`invalid markdown (${error.message})`);
      }

      // Check resulting object
      const indexHeadings = Object.keys(index);
      if (indexHeadings.length === 0 || indexHeadings[0] === 'raw') {
        throw new Error('data is missing a name heading');
      }

      // Get name
      name = indexHeadings[0];

      // Get description
      description = name in index ? index[name].content.trim() : '';

      // Parse options
      // Options will be serialized back to front-matter, this check remains here for backwards-compatibility
      if ('Options' in index) {
        try {
          // Get embedded options and make sure it's an object
          const embeddedOptions = yaml.parse(index.Options.content.trim().replace(/```(yaml|yml)?/g, ''));
          if (typeof embeddedOptions !== 'object') {
            throw new Error('invalid options content');
          }

          // Merge with front matter options
          options = Object.assign(options, embeddedOptions);
        } catch (error) {
          throw new Error(`invalid options: ${error.message}`);
        }
      }

      try {
        validateOptions(options);
      } catch (error) {
        throw new Error(`invalid options: ${error.message}`);
      }

      // Parse columns
      const columnNames = Object.keys(index).filter((column) => ['raw', 'Options', name].indexOf(column) === -1);
      if (columnNames.length) {
        try {
          columns = Object.fromEntries(columnNames.map((columnName) => {
            try {
              // If the column content is empty or just whitespace, return an empty array
              if (!index[columnName].content || index[columnName].content.trim() === '') {
                return [columnName, []];
              }

              // Parse the content with markdown
              const tokens = markdown.lexer(index[columnName].content);

              // Check if the first token is a list
              if (tokens.length > 0 && tokens[0].type === 'list') {
                try {
                  // Safely extract text from tokens with proper error handling
                  return [
                    columnName,
                    tokens[0].items.map((item) => {
                      try {
                        // Check if the token structure is as expected
                        if (item
                            && item.tokens
                            && item.tokens[0]
                            && item.tokens[0].tokens
                            && item.tokens[0].tokens[0]
                            && typeof item.tokens[0].tokens[0].text === 'string') {
                          return item.tokens[0].tokens[0].text;
                        } if (item && item.text) {
                          // Fallback to item.text if available
                          return item.text;
                        }
                        // Return empty string as a last resort
                        return '';
                      } catch (err) {
                        console.warn(`Warning: Error extracting text from list item: ${err.message}`);
                        return '';
                      }
                    }),
                  ];
                } catch (err) {
                  console.warn(`Warning: Error processing list items: ${err.message}`);
                  return [columnName, []];
                }
              } else {
                // If the content exists but is not a list, return an empty array
                // This is more forgiving than throwing an error
                return [columnName, []];
              }
            } catch (error) {
              // If there's an error parsing the column content, return an empty array
              // This is more forgiving than throwing an error
              console.warn(`Warning: column "${columnName}" could not be parsed: ${error.message}`);
              return [columnName, []];
            }
          }));
        } catch (error) {
          throw new Error(`invalid columns: ${error.message}`);
        }
      }
    } catch (error) {
      throw new Error(`Unable to parse index: ${error.message}`);
    }

    // Assemble index object
    return {
      name, description, options, columns,
    };
  },

  /**
   * Convert an index object into markdown
   * @param {object} data
   * @param {boolean} [ignoreOptions=false]
   * @return {string}
   */
  json2md(data, ignoreOptions = false) {
    const result = [];
    try {
      // Check data type
      if (!data) {
        throw new Error('data is null or empty');
      }
      if (typeof data !== 'object') {
        throw new Error('data is not an object');
      }

      // Check required fields
      if (!('name' in data)) {
        throw new Error('data object is missing name');
      }

      // Add options as front-matter content if present and not ignoring
      if ('options' in data && data.options !== null && !ignoreOptions) {
        validateOptions(data.options);
        if (Object.keys(data.options).length) {
          result.push(
            `---\n${yaml.stringify(data.options, 4, 2).trim()}\n---`,
          );
        }
      }

      // Add name and description
      result.push(`# ${data.name}`);
      if ('description' in data) {
        result.push(data.description);
      }

      // Check columns
      if (!('columns' in data)) {
        throw new Error('data object is missing columns');
      }
      validateColumns(data.columns);

      // Add columns
      for (const column in data.columns) {
        result.push(
          `## ${column}`,
          data.columns[column].length > 0
            ? data.columns[column].map((task) => {
              // Ensure task is a simple string without markdown formatting
              const taskId = task.replace(/[\[\]\(\)]/g, '').split('/').pop().replace(/\.md$/, '');
              return `- ${taskId}`;
            }).join('\n')
            : '',
        );
      }
    } catch (error) {
      throw new Error(`Unable to build index: ${error.message}`);
    }

    // Filter empty lines and join into a string
    return `${result.filter((l) => !!l).join('\n\n')}\n`;
  },
};
