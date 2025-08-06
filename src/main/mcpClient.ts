// mcpClient.ts
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { WebSocketClientTransport } from '@modelcontextprotocol/sdk/client/websocket.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport';

export interface MCPServerConfig {
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
}

export interface MCPConfig {
  mcpServers: Record<string, MCPServerConfig>;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
}

export class MCPManager {
  private clients: Map<string, Client> = new Map();

  async loadFromConfig(config: MCPConfig): Promise<void> {
    const connectionPromises = Object.entries(config.mcpServers).map(async ([name, serverConfig]) => {
      try {
        console.log(`Connecting to: ${name}`);
        const transport = this.detectAndCreateTransport(serverConfig);
        
        const client = new Client({
          name: `client-${name}`,
          version: '1.0.0'
        }, {
          capabilities: {}
        });

        await client.connect(transport);
        this.clients.set(name, client);
        console.log(`✓ ${name} connected`);
      } catch (error) {
        console.error(`❌ ${name} connection failed:`, error);
        throw new Error(`Failed to connect to ${name} server: ${error}`);
      }
    });

    await Promise.all(connectionPromises);
  }

  async listAllTools(): Promise<Record<string, MCPTool[]>> {
    const allTools: Record<string, MCPTool[]> = {};
    
    for (const [name, client] of this.clients) {
      try {
        const tools = await client.listTools();
        allTools[name] = tools.tools as MCPTool[];
        console.log(`\n[${name}] tools list:`);
        tools.tools.forEach((tool: any) => {
          console.log(`  - ${tool.name}: ${tool.description || 'No description'}`);
        });
      } catch (error) {
        console.error(`❌ ${name} tools list retrieval failed:`, error);
        allTools[name] = [];
      }
    }
    
    return allTools;
  }

  async callTool(serverName: string, toolName: string, args: any): Promise<any> {
    const client = this.clients.get(serverName);
    if (!client) {
      throw new Error(`Server not found: ${serverName}`);
    }
    
    try {
      return await client.callTool({ 
        name: toolName, 
        arguments: args 
      });
    } catch (error) {
      console.error(`❌ Tool execution failed (${serverName}.${toolName}):`, error);
      throw new Error(`Tool execution failed: ${error}`);
    }
  }

  async closeAll(): Promise<void> {
    const closePromises = Array.from(this.clients.entries()).map(async ([name, client]) => {
      try {
        await client.close();
        console.log(`✓ ${name} closed`);
      } catch (error) {
        console.error(`❌ ${name} close failed:`, error);
      }
    });

    await Promise.all(closePromises);
    this.clients.clear();
  }

  private detectAndCreateTransport(config: MCPServerConfig): Transport {
    if (config.command) {
      return new StdioClientTransport({
        command: config.command,
        args: config.args || [],
        env: config.env
      });
    }
    
    if (config.url) {
      const url = new URL(config.url);
      
      if (url.protocol === 'ws:' || url.protocol === 'wss:') {
        return new WebSocketClientTransport(url);
      }
      
      return new SSEClientTransport(url);
    }
    
    throw new Error('Invalid config: need either command or url');
  }

  getConnectedServers(): string[] {
    return Array.from(this.clients.keys());
  }

  isConnected(serverName: string): boolean {
    return this.clients.has(serverName);
  }
}