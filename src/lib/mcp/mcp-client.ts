import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import type { StructuredTool } from "@langchain/core/tools";
import { getCachedMCPClient } from "./cached-mcp-client";
import type { RetryOptions } from "../retry/retry-manager";

/**
 * MCP Client for connecting to a single n8n MCP server
 * Enhanced with high-performance caching layer
 * Uses LangChain MCP Adapters for proper MCP protocol support
 */
export class MCPClient {
  private client: MultiServerMCPClient | null = null;
  private tools: StructuredTool[] = [];
  private initialized = false;
  private cachedClient: ReturnType<typeof getCachedMCPClient> | null = null;

  constructor() {
    // Initialize cached client for performance
    this.cachedClient = getCachedMCPClient();
  }

  /**
   * Initialize the MCP client and connect to the server
   */
  private async initialize() {
    if (this.initialized) return;

    console.log("🔌 [MCP_CLIENT] Initializing MCP client...");

    // Get MCP server URL from environment
    const mcpServerUrl = process.env.MCP_SERVER_URL;

    if (!mcpServerUrl) {
      throw new Error("MCP_SERVER_URL environment variable is not set");
    }

    console.log("🔌 [MCP_CLIENT] Connecting to MCP server:", mcpServerUrl);

    try {
      // Create client with single n8n MCP server
      this.client = new MultiServerMCPClient({
        // Use standardized content blocks for better compatibility
        useStandardContentBlocks: true,

        // Don't prefix tool names with server name (since we only have one server)
        prefixToolNameWithServerName: false,

        // Single MCP Server configuration
        mcpServers: {
          "n8n-server": {
            transport: "sse",
            url: mcpServerUrl,
            headers: {
              "Accept": "application/json, text/event-stream",
              "Content-Type": "application/json",
            },
            reconnect: {
              enabled: true,
              maxAttempts: 3,
              delayMs: 1000,
            },
          },
        },
      });

      // Load all tools from the MCP server
      this.tools = await this.client.getTools();

      console.log(`✅ [MCP_CLIENT] Loaded ${this.tools.length} tools from MCP server`);
      console.log("📋 [MCP_CLIENT] Available tools:", this.tools.map(t => t.name).join(", "));

      // Log each tool's schema for debugging
      this.tools.forEach(tool => {
        console.log(`📋 [MCP_CLIENT] Tool: ${tool.name}`);
        console.log(`   Description: ${tool.description}`);
        console.log(`   Schema:`, JSON.stringify(tool.schema, null, 2));
      });

      this.initialized = true;
    } catch (error) {
      console.error("❌ [MCP_CLIENT] Failed to initialize:", error);
      throw error;
    }
  }

  /**
   * Warm up the MCP client connection (call this early to avoid lazy initialization delay)
   */
  async warmup(): Promise<void> {
    await this.initialize();
  }

  /**
   * Get a specific tool by name
   */
  async getTool(toolName: string): Promise<StructuredTool | undefined> {
    await this.initialize();
    return this.tools.find(t => t.name === toolName);
  }

  /**
   * Get all available tools
   */
  async getTools(): Promise<StructuredTool[]> {
    await this.initialize();
    return this.tools;
  }

  /**
   * Call a specific MCP tool by name with arguments
   * Enhanced with intelligent caching, retry logic, and validation for performance & reliability
   * This is the main method - call tools directly using their actual names from the MCP server
   */
  async callTool(toolName: string, args: Record<string, any>, options?: {
    ttl?: number;
    bypassCache?: boolean;
    retry?: RetryOptions;
    skipValidation?: boolean;
  }): Promise<any> {
    // Use cached client for better performance
    if (this.cachedClient) {
      console.log(`🚀 [MCP_CLIENT] Using cached client for ${toolName}`);
      return await this.cachedClient.callTool(toolName, args, options);
    }

    // Fallback to direct call if cached client unavailable
    await this.initialize();

    const tool = this.tools.find(t => t.name === toolName);
    if (!tool) {
      const availableTools = this.tools.map(t => t.name).join(", ");
      throw new Error(
        `Tool "${toolName}" not found. Available tools: ${availableTools}`
      );
    }

    console.log(`🔧 [MCP_CLIENT] Calling tool directly (no cache): ${toolName}`, args);

    try {
      const result = await tool.invoke(args);
      console.log(`✅ [MCP_CLIENT] Tool ${toolName} completed`);
      return result;
    } catch (error) {
      console.error(`❌ [MCP_CLIENT] Tool ${toolName} failed:`, error);
      throw error;
    }
  }

  /**
   * Get cache performance metrics
   */
  getCacheMetrics() {
    if (this.cachedClient) {
      return this.cachedClient.getCacheMetrics();
    }
    return { hits: 0, misses: 0, total: 0, hitRate: 0 };
  }

  /**
   * Get retry and circuit breaker metrics
   */
  getRetryMetrics() {
    if (this.cachedClient) {
      return this.cachedClient.getRetryMetrics();
    }
    return {};
  }

  /**
   * Get circuit breaker states
   */
  getCircuitBreakerStates() {
    if (this.cachedClient) {
      return this.cachedClient.getCircuitBreakerStates();
    }
    return {};
  }

  /**
   * Clear cache (useful for testing or forced refresh)
   */
  clearCache() {
    if (this.cachedClient) {
      this.cachedClient.clearCache();
    }
  }

  /**
   * Close the MCP client and cleanup connections
   */
  async close() {
    if (this.cachedClient) {
      await this.cachedClient.close();
    }
    if (this.client) {
      await this.client.close();
      this.initialized = false;
      this.tools = [];
      console.log("🔌 [MCP_CLIENT] Closed MCP client");
    }
  }
}

// Singleton instance
let mcpClientInstance: MCPClient | null = null;

export function getMCPClient(): MCPClient {
  if (!mcpClientInstance) {
    mcpClientInstance = new MCPClient();
  }
  return mcpClientInstance;
}
