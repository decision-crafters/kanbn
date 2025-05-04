/**
 * Firecrawl Client Module
 * 
 * Provides an interface to the Firecrawl MCP service for web research
 */

class FirecrawlClient {
  /**
   * Create a new Firecrawl client
   */
  constructor() {
    this.enabled = process.env.KANBN_USE_FIRECRAWL === 'true';
    this.maxDepth = parseInt(process.env.KANBN_FIRECRAWL_DEPTH || '3', 10);
    this.maxUrls = parseInt(process.env.KANBN_FIRECRAWL_MAX_URLS || '10', 10);
    this.timeout = parseInt(process.env.KANBN_FIRECRAWL_TIMEOUT || '120', 10);
  }

  /**
   * Check if Firecrawl is enabled and configured
   * @returns {boolean} True if enabled and configured
   */
  isAvailable() {
    return this.enabled;
  }

  /**
   * Search for relevant content
   * @param {Object} options Search options
   * @returns {Promise<Object>} Search results
   */
  async search(options) {
    if (!this.isAvailable()) {
      console.log('[INFO] Firecrawl is disabled');
      return { results: [] };
    }

    try {
      const searchOptions = {
        query: options.query,
        limit: options.limit || 5,
        scrapeOptions: {
          formats: ['markdown', 'extract'],
          onlyMainContent: true,
          waitFor: 2000,
          removeBase64Images: true,
          blockAds: true
        }
      };

      return await this.mcp.firecrawl_search(searchOptions);
    } catch (error) {
      console.warn('[WARN] Firecrawl search failed:', error.message);
      return { results: [] };
    }
  }

  /**
   * Perform deep research on a topic
   * @param {Object} options Research options
   * @returns {Promise<Object>} Research results
   */
  async deepResearch(options) {
    if (!this.isAvailable()) {
      console.log('[INFO] Firecrawl is disabled');
      return { summary: '' };
    }

    try {
      const researchOptions = {
        query: options.query,
        maxDepth: Math.min(options.maxDepth || this.maxDepth, 5),
        maxUrls: Math.min(options.maxUrls || this.maxUrls, 20),
        timeLimit: Math.min(options.timeLimit || this.timeout, 300)
      };

      return await this.mcp.firecrawl_deep_research(researchOptions);
    } catch (error) {
      console.warn('[WARN] Firecrawl deep research failed:', error.message);
      return { summary: '' };
    }
  }
}

module.exports = FirecrawlClient;
