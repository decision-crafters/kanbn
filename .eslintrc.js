module.exports = {
  env: {
    commonjs: true,
    es2021: true,
    node: true,
    jest: true, // Add jest environment
  },
  extends: [
    'airbnb-base',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
  },
  rules: {
    // Add any custom rule overrides here
    // e.g., 'no-console': 'off', // to allow console.log, warn, error
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_|^next$' }], // Warn about unused vars, ignore if starts with _ or is 'next'
    'no-plusplus': 'off', // Allow ++ and -- operators
    'no-param-reassign': ['warn', { props: false }], // Warn on param reassign but allow for prop modification
    'no-restricted-syntax': [
      'error',
      'ForInStatement',
      // 'ForOfStatement', // Uncomment if you want to disallow ForOfStatement too
      'LabeledStatement',
      'WithStatement',
    ],
    // You might want to allow console for a CLI tool, or be more specific
    'no-console': ['warn', { allow: ['warn', 'error', 'info', 'log', 'debug'] }],
    'max-len': ['error', { code: 100, ignoreRegExpLiterals: true, ignoreUrls: true, ignoreStrings: true, ignoreTemplateLiterals: true }],
  },
  ignorePatterns: [
    'node_modules/',
    'coverage/',
    'docs/', // Often, generated docs or docs examples aren't linted
    '*.json', // ESLint doesn't typically lint JSON files
    '*.md', // Markdown files
  ],
};
