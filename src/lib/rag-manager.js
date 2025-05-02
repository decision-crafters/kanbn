/**
 * RAG Manager for Kanbn
 *
 * Manages integrations using RAG (Retrieval-Augmented Generation) approach
 * with LangChain vector stores for improved context retrieval.
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const axios = require('axios');
const utility = require('../utility');
const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const readdir = promisify(fs.readdir);
const unlink = promisify(fs.unlink);

// LangChain imports
const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");
const { MemoryVectorStore } = require("langchain/vectorstores/memory");
const { OllamaEmbeddings } = require("@langchain/ollama");
const { Document } = require("langchain/document");

class RAGManager {
    /**
     * Create a new RAG manager for enhanced integrations
     * @param {Object} kanbn - Kanbn instance
     */
    constructor(kanbn) {
        // Kanbn instance
        this.kanbn = kanbn;

        // Path to the integrations directory
        this.integrationsPath = kanbn.paths ?
            path.join(kanbn.paths.kanbn, 'integrations') :
            path.join(process.cwd(), '.kanbn', 'integrations');

        // In-memory vector store
        this.vectorStore = null;

        // Embeddings provider (using Ollama by default if available)
        this.embeddings = null;

        // Text splitter for chunking documents
        this.textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: 500,
            chunkOverlap: 50,
        });
    }

    /**
     * Initialize the RAG manager
     * Creates the integrations directory if it doesn't exist
     * @returns {Promise<void>}
     */
    async initialize() {
        try {
            // Create the integrations directory if it doesn't exist
            if (!fs.existsSync(this.integrationsPath)) {
                utility.debugLog(`Created integrations directory: ${this.integrationsPath}`);
                await mkdir(this.integrationsPath, { recursive: true });

                // Add a default integration file for GitHub
                const defaultContent = '# GitHub Integration\n\nThis is the default GitHub integration for Kanbn. It provides information about GitHub repositories.';
                await writeFile(path.join(this.integrationsPath, 'github.md'), defaultContent);
                utility.debugLog('Added default GitHub integration file');
            } else {
                utility.debugLog(`Integrations directory already exists: ${this.integrationsPath}`);
            }

            // Initialize embeddings with Ollama if available
            try {
                // First try with the user-specified model from environment variable
                const ollamaModel = process.env.OLLAMA_MODEL;
                const ollamaUrl = process.env.OLLAMA_URL || process.env.OLLAMA_HOST || "http://127.0.0.1:11434";

                // Try to initialize embeddings with the appropriate model
                if (ollamaModel) {
                    // Try user-specified model first
                    try {
                        this.embeddings = new OllamaEmbeddings({
                            model: ollamaModel,
                            baseUrl: ollamaUrl
                        });
                        utility.debugLog(`Initialized Ollama embeddings with user-specified model: ${ollamaModel}`);
                    } catch (userModelError) {
                        utility.debugLog(`Failed to use user-specified model ${ollamaModel}: ${userModelError.message}`);

                        // Fall back to known models
                        this.initializeFallbackEmbeddings(ollamaUrl);
                    }
                } else {
                    // No user-specified model, try with known models
                    utility.debugLog("No OLLAMA_MODEL specified, falling back to known models");
                    this.initializeFallbackEmbeddings(ollamaUrl);
                }
            } catch (error) {
                utility.debugLog(`Ollama embeddings not available: ${error.message}, using fallback method`);
                // Use a simple fallback embedding method if Ollama isn't available
                this.embeddings = this.createHashBasedEmbeddings();
                utility.debugLog('Using fallback hash-based embeddings');
            }
        } catch (error) {
            utility.error(`Error initializing RAG manager: ${error.message}`);
            throw error;
        }
    }

    /**
     * Initialize fallback embeddings with known models
     * @param {string} baseUrl - The Ollama API URL
     * @private
     */
    initializeFallbackEmbeddings(baseUrl) {
        try {
            // Try with llama3 which is often available
            try {
                this.embeddings = new OllamaEmbeddings({
                    model: "llama3",
                    baseUrl: baseUrl
                });
                utility.debugLog('Initialized Ollama embeddings with llama3 model (fallback)');
            } catch (modelError) {
                // If llama3 fails, try with qwen2.5-coder which is also available
                try {
                    this.embeddings = new OllamaEmbeddings({
                        model: "qwen2.5-coder",
                        baseUrl: baseUrl
                    });
                    utility.debugLog('Initialized Ollama embeddings with qwen2.5-coder model (fallback)');
                } catch (embedModelError) {
                    // If that fails too, try with qwen-repo-assistant
                    try {
                        this.embeddings = new OllamaEmbeddings({
                            model: "qwen-repo-assistant",
                            baseUrl: baseUrl
                        });
                        utility.debugLog('Initialized Ollama embeddings with qwen-repo-assistant model (fallback)');
                    } catch (repoAssistantError) {
                        // Last resort: try with default model
                        this.embeddings = new OllamaEmbeddings({
                            baseUrl: baseUrl
                        });
                        utility.debugLog('Initialized Ollama embeddings with default model (fallback)');
                    }
                }
            }
        } catch (fallbackError) {
            utility.debugLog(`All fallback models failed: ${fallbackError.message}`);
            // Create hash-based embeddings as a last resort
            this.embeddings = this.createHashBasedEmbeddings();
            utility.debugLog('Using hash-based embeddings after all fallback models failed');
        }
    }

    /**
     * Create simple hash-based embeddings as a fallback
     * @returns {Object} A simple embeddings object
     * @private
     */
    createHashBasedEmbeddings() {
        return {
            embedDocuments: async (texts) => {
                // Simple fallback embedding (not robust but prevents crashes)
                return texts.map(text => {
                    // Create a simple hash-based embedding (very basic)
                    const hash = Array.from(text)
                        .reduce((acc, char) => acc + char.charCodeAt(0), 0);
                    // Create a 10-dimensional "embedding" (just for structure)
                    return Array(10).fill(0).map((_, i) => (hash % (i + 1)) / 100);
                });
            },
            embedQuery: async (text) => {
                // Simple fallback query embedding (should match document embedding format)
                const hash = Array.from(text)
                    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
                return Array(10).fill(0).map((_, i) => (hash % (i + 1)) / 100);
            }
        };
    }

    /**
     * Load all integrations from the filesystem and build the vector store
     * @returns {Promise<boolean>} Success status
     */
    async loadIntegrations() {
        try {
            // Get all markdown files in the integrations directory
            const files = await readdir(this.integrationsPath);
            const markdownFiles = files.filter(file => file.endsWith('.md'));

            if (markdownFiles.length === 0) {
                utility.debugLog('No integration files found');
                return false;
            }

            // Load each file and convert to LangChain documents
            const documents = [];
            for (const file of markdownFiles) {
                const filePath = path.join(this.integrationsPath, file);
                const content = await readFile(filePath, 'utf8');
                const name = path.basename(file, '.md');

                // Split the content into chunks
                const textChunks = await this.textSplitter.splitText(content);

                // Create a document for each chunk
                for (const chunk of textChunks) {
                    const doc = new Document({
                        pageContent: chunk,
                        metadata: {
                            source: name,
                            filename: file
                        }
                    });
                    documents.push(doc);
                }
            }

            // Create the vector store with the documents
            try {
                this.vectorStore = await MemoryVectorStore.fromDocuments(
                    documents,
                    this.embeddings
                );
            } catch (vectorStoreError) {
                utility.error(`Error creating vector store: ${vectorStoreError.message}`);

                // Create a simple in-memory store that doesn't rely on embeddings
                // This is a very basic fallback that will at least allow the system to function
                this.vectorStore = {
                    similaritySearch: async (query, k) => {
                        // Very simple keyword matching as fallback
                        utility.debugLog('Using fallback similarity search');

                        // Convert query to lowercase for case-insensitive matching
                        const queryLower = query.toLowerCase();

                        // Score documents based on simple word matching
                        const scoredDocs = documents.map(doc => {
                            const content = doc.pageContent.toLowerCase();
                            // Count how many words from the query appear in the content
                            const queryWords = queryLower.split(/\s+/);
                            const matchCount = queryWords.filter(word =>
                                word.length > 3 && content.includes(word)
                            ).length;

                            return {
                                doc,
                                score: matchCount
                            };
                        });

                        // Sort by score (descending) and take top k
                        const topDocs = scoredDocs
                            .sort((a, b) => b.score - a.score)
                            .slice(0, k)
                            .map(item => item.doc);

                        return topDocs;
                    }
                };

                utility.debugLog('Created fallback vector store');
            }

            utility.debugLog(`Loaded ${documents.length} chunks from ${markdownFiles.length} integration files`);
            return true;
        } catch (error) {
            utility.error(`Error loading integrations: ${error.message}`);
            return false;
        }
    }

    /**
     * Add a new integration
     * @param {string} name - Integration name
     * @param {string} content - Integration content (markdown)
     * @returns {Promise<boolean>} Success status
     */
    async addIntegration(name, content) {
        try {
            // Sanitize the name to create a valid filename
            const safeName = name.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
            const filename = `${safeName}.md`;
            const filePath = path.join(this.integrationsPath, filename);

            // Write the integration file
            await writeFile(filePath, content);

            // Add to vector store if it already exists
            if (this.vectorStore) {
                // Split the content into chunks
                const textChunks = await this.textSplitter.splitText(content);

                // Create a document for each chunk
                const documents = textChunks.map(chunk => new Document({
                    pageContent: chunk,
                    metadata: {
                        source: safeName,
                        filename: filename
                    }
                }));

                // Add the documents to the vector store
                await this.vectorStore.addDocuments(documents);
                utility.debugLog(`Added ${documents.length} chunks from ${safeName} to vector store`);
            }

            utility.debugLog(`Added integration: ${safeName}`);
            return true;
        } catch (error) {
            utility.error(`Error adding integration: ${error.message}`);
            return false;
        }
    }

    /**
     * Add a new integration from a URL
     * @param {string} name - Integration name
     * @param {string} url - URL to fetch content from
     * @returns {Promise<boolean>} Success status
     */
    async addIntegrationFromUrl(name, url) {
        try {
            // Validate URL
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                throw new Error('URL must start with http:// or https://');
            }

            utility.debugLog(`Adding integration from URL: ${url}`);

            // Check if we need to convert HTML to Markdown
            let content;
            try {
                // Import the HTML-to-Markdown converter
                const { isLikelyHtmlUrl, convertUrlToMarkdown } = require('../utils/html-to-markdown');

                // Check if the URL is likely to be an HTML webpage
                if (isLikelyHtmlUrl(url)) {
                    utility.debugLog(`URL appears to be an HTML webpage, converting to Markdown: ${url}`);

                    // Convert HTML to Markdown
                    content = await convertUrlToMarkdown(url);
                    utility.debugLog('Successfully converted HTML to Markdown');
                } else {
                    // Fetch raw content directly
                    utility.debugLog(`Fetching raw content from URL: ${url}`);
                    const response = await axios.get(url);
                    content = response.data;

                    // If content is not a string (e.g., JSON), convert it to string
                    if (typeof content !== 'string') {
                        content = JSON.stringify(content, null, 2);
                    }

                    // Add metadata about the source URL
                    content = `# ${name}\n\nSource: ${url}\n\n${content}`;
                }
            } catch (conversionError) {
                // If HTML-to-Markdown conversion fails, fall back to direct fetching
                utility.debugLog(`HTML conversion failed, falling back to direct fetching: ${conversionError.message}`);
                const response = await axios.get(url);
                content = response.data;

                // If content is not a string (e.g., JSON), convert it to string
                if (typeof content !== 'string') {
                    content = JSON.stringify(content, null, 2);
                }

                // Add metadata about the source URL
                content = `# ${name}\n\nSource: ${url}\n\n${content}`;
            }

            // Add the integration with the fetched content
            return await this.addIntegration(name, content);
        } catch (error) {
            utility.error(`Error adding integration from URL: ${error.message}`);
            return false;
        }
    }

    /**
     * Remove an integration
     * @param {string} name - Integration name
     * @returns {Promise<boolean>} Success status
     */
    async removeIntegration(name) {
        try {
            // Sanitize the name to create a valid filename
            const safeName = name.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
            const filename = `${safeName}.md`;
            const filePath = path.join(this.integrationsPath, filename);

            // Check if the file exists
            if (!fs.existsSync(filePath)) {
                utility.error(`Integration not found: ${safeName}`);
                return false;
            }

            // Remove the file
            await unlink(filePath);

            // If we have a vector store, we should rebuild it
            // This is simpler than trying to remove specific documents
            if (this.vectorStore) {
                await this.loadIntegrations();
            }

            utility.debugLog(`Removed integration: ${safeName}`);
            return true;
        } catch (error) {
            utility.error(`Error removing integration: ${error.message}`);
            return false;
        }
    }

    /**
     * List all available integrations
     * @returns {Promise<Array<string>>} List of integration names
     */
    async listIntegrations() {
        try {
            // Get all markdown files in the integrations directory
            const files = await readdir(this.integrationsPath);
            const markdownFiles = files.filter(file => file.endsWith('.md'));

            // Extract names from filenames
            return markdownFiles.map(file => path.basename(file, '.md'));
        } catch (error) {
            utility.error(`Error listing integrations: ${error.message}`);
            return [];
        }
    }

    /**
     * Get integration content
     * @param {string} name - Integration name
     * @returns {Promise<string|null>} Integration content or null if not found
     */
    async getIntegrationContent(name) {
        try {
            // Sanitize the name to create a valid filename
            const safeName = name.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
            const filename = `${safeName}.md`;
            const filePath = path.join(this.integrationsPath, filename);

            // Check if the file exists
            if (!fs.existsSync(filePath)) {
                utility.error(`Integration not found: ${safeName}`);
                return null;
            }

            // Read the file content
            return await readFile(filePath, 'utf8');
        } catch (error) {
            utility.error(`Error getting integration content: ${error.message}`);
            return null;
        }
    }

    /**
     * Get relevant integration content for a query
     * @param {string} query - The query to retrieve relevant content for
     * @param {number} [count=3] - Number of relevant chunks to retrieve
     * @returns {Promise<string>} Combined relevant content
     */
    async getRelevantContent(query, count = 3) {
        try {
            if (!this.vectorStore) {
                await this.loadIntegrations();

                // If still no vector store, return empty string
                if (!this.vectorStore) {
                    utility.debugLog('No vector store available for retrieving content');
                    return '';
                }
            }

            // FALLBACK APPROACH: If we have few integrations, just return all content
            // This ensures we at least provide some context even if vector search fails
            try {
                const integrations = await this.listIntegrations();
                if (integrations.length <= 5) {
                    utility.debugLog(`Using fallback approach: returning all integration content for ${integrations.length} integrations`);

                    // Get content of all integrations
                    let allContent = '';
                    for (const integration of integrations) {
                        const content = await this.getIntegrationContent(integration);
                        if (content) {
                            allContent += `\n\n## From ${integration}\n\n${content}`;
                        }
                    }

                    if (allContent) {
                        utility.debugLog(`Retrieved all content from ${integrations.length} integrations`);
                        return allContent;
                    }
                }
            } catch (fallbackError) {
                utility.debugLog(`Fallback approach failed: ${fallbackError.message}`);
            }

            // Perform a similarity search to find relevant content
            let results = [];
            try {
                results = await this.vectorStore.similaritySearch(query, count);
            } catch (searchError) {
                utility.error(`Error during similarity search: ${searchError.message}`);

                // Try direct keyword matching as a fallback
                try {
                    utility.debugLog('Trying keyword matching as fallback');

                    // Get all integrations
                    const integrations = await this.listIntegrations();
                    let allContent = '';

                    // Simple keyword extraction from query
                    const keywords = query.toLowerCase()
                        .split(/\s+/)
                        .filter(word => word.length > 3)
                        .filter(word => !['this', 'that', 'with', 'from', 'what', 'when', 'where', 'which', 'about'].includes(word));

                    utility.debugLog(`Extracted keywords: ${keywords.join(', ')}`);

                    // Check each integration for keyword matches
                    for (const integration of integrations) {
                        const content = await this.getIntegrationContent(integration);
                        if (content) {
                            // Check if content contains any keywords
                            const contentLower = content.toLowerCase();
                            const matchingKeywords = keywords.filter(keyword => contentLower.includes(keyword));

                            if (matchingKeywords.length > 0) {
                                allContent += `\n\n## From ${integration} (matched keywords: ${matchingKeywords.join(', ')})\n\n${content}`;
                            }
                        }
                    }

                    if (allContent) {
                        utility.debugLog(`Retrieved content using keyword matching`);
                        return allContent;
                    }

                    // If no matches, return all content from a limited number of integrations
                    if (integrations.length <= 5) {
                        allContent = '';
                        for (const integration of integrations) {
                            const content = await this.getIntegrationContent(integration);
                            if (content) {
                                allContent += `\n\n## From ${integration}\n\n${content}`;
                            }
                        }

                        if (allContent) {
                            utility.debugLog(`No keyword matches, returning all content from ${integrations.length} integrations`);
                            return allContent;
                        }
                    }
                } catch (keywordError) {
                    utility.debugLog(`Keyword matching failed: ${keywordError.message}`);
                }

                // Return a helpful message about the error
                return `\n\nError retrieving integration content: ${searchError.message}\n\nPlease ensure Ollama is running with a compatible embedding model.`;
            }

            // Combine the results into a single string
            let content = '';
            const sources = new Set();

            // If we have results, process them
            if (results && results.length > 0) {
                for (const result of results) {
                    // Add source info at the beginning of each chunk
                    content += `\n\n## From ${result.metadata.source}\n\n`;
                    content += result.pageContent;

                    // Track sources for summary
                    sources.add(result.metadata.source);
                }
            } else {
                // If no results from similarity search, try to get all content
                try {
                    utility.debugLog('No results from similarity search, trying to get all content');

                    // Get all integrations
                    const integrations = await this.listIntegrations();
                    if (integrations.length <= 5) {
                        for (const integration of integrations) {
                            const integrationContent = await this.getIntegrationContent(integration);
                            if (integrationContent) {
                                content += `\n\n## From ${integration}\n\n${integrationContent}`;
                                sources.add(integration);
                            }
                        }
                    }

                    if (content === '') {
                        // If still no content, provide a helpful message
                        content = '\n\nNo relevant integration content found for your query.';
                    }
                } catch (allContentError) {
                    utility.debugLog(`Error getting all content: ${allContentError.message}`);
                    content = '\n\nNo relevant integration content found for your query.';
                }
            }

            utility.debugLog(`Retrieved relevant content from ${sources.size} sources: ${Array.from(sources).join(', ')}`);
            return content;
        } catch (error) {
            utility.error(`Error getting relevant content: ${error.message}`);
            return '';
        }
    }
}

module.exports = RAGManager;
