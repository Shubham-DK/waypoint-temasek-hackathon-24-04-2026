// MCP Connection Manager for Chrome Extension
// Adapted from example-remote-client — uses chrome.storage + chrome.tabs for OAuth

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { ChromeExtensionOAuthProvider } from './oauth';
import { normalizeServerId } from './servers';
import type { MCPServerConfig, MCPTool } from './types';

export interface MCPCallResult {
  content: Array<{ type: string; text?: string; [key: string]: unknown }>;
  isError?: boolean;
}

export class MCPConnectionManager {
  private client?: Client;
  private transport?: StreamableHTTPClientTransport | SSEClientTransport;
  private oauthProvider: ChromeExtensionOAuthProvider;
  private config: MCPServerConfig;
  private onReconnect?: () => Promise<void>;

  constructor(config: MCPServerConfig) {
    this.config = config;
    this.oauthProvider = new ChromeExtensionOAuthProvider(
      config.id,
      config.name,
      config.url,
      () => {
        // After successful OAuth, trigger reconnect
        this.onReconnect?.();
      },
    );
  }

  /** Supply a callback that the manager calls after OAuth completes so the caller can re-try connect() */
  setReconnectCallback(cb: () => Promise<void>): void {
    this.onReconnect = cb;
  }

  async connect(): Promise<MCPTool[]> {
    // Pre-load cached OAuth data so sync accessors work
    await this.oauthProvider.loadClientInfo();
    await this.oauthProvider.loadTokens();

    // Disconnect any existing session first
    await this.disconnect();

    try {
      await this._tryStreamableHttp();
    } catch {
      // StreamableHTTP failed — try SSE fallback
      await this._trySSE();
    }

    return this.discoverTools();
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      try { await this.client.close(); } catch { /* ignore */ }
      this.client = undefined;
    }
    if (this.transport) {
      try { await this.transport.close(); } catch { /* ignore */ }
      this.transport = undefined;
    }
  }

  async discoverTools(): Promise<MCPTool[]> {
    if (!this.client) throw new Error('Not connected');
    const result = await this.client.listTools();
    const prefix = normalizeServerId(this.config.id);
    return result.tools.map(t => ({
      name: `${prefix}__${t.name}`,
      description: `[${this.config.name}] ${t.description ?? ''}`,
      input_schema: (t.inputSchema as Record<string, unknown>) ?? { type: 'object', properties: {} },
    }));
  }

  async callTool(prefixedName: string, args: Record<string, unknown>): Promise<MCPCallResult> {
    if (!this.client) throw new Error('Not connected');
    const prefix = normalizeServerId(this.config.id) + '__';
    const rawName = prefixedName.startsWith(prefix)
      ? prefixedName.slice(prefix.length)
      : prefixedName;

    const result = await this.client.callTool({ name: rawName, arguments: args });
    return result as MCPCallResult;
  }

  isConnected(): boolean {
    return !!this.client;
  }

  private async _tryStreamableHttp(): Promise<void> {
    const transport = new StreamableHTTPClientTransport(new URL(this.config.url), {
      authProvider: this.oauthProvider,
    });
    await this._initClient(transport);
    this.transport = transport;
  }

  private async _trySSE(): Promise<void> {
    const transport = new SSEClientTransport(new URL(this.config.url), {
      authProvider: this.oauthProvider,
    });
    await this._initClient(transport);
    this.transport = transport;
  }

  private async _initClient(transport: StreamableHTTPClientTransport | SSEClientTransport): Promise<void> {
    const client = new Client(
      { name: 'waypoint-extension', version: '2.0.0' },
      { capabilities: {} },
    );
    await client.connect(transport);
    this.client = client;
  }
}

// --- Singleton registry keyed by server ID ---
const registry = new Map<string, MCPConnectionManager>();

export function getConnectionManager(config: MCPServerConfig): MCPConnectionManager {
  if (!registry.has(config.id)) {
    registry.set(config.id, new MCPConnectionManager(config));
  }
  return registry.get(config.id)!;
}

export function removeConnectionManager(serverId: string): void {
  const mgr = registry.get(serverId);
  if (mgr) {
    mgr.disconnect().catch(() => {});
    registry.delete(serverId);
  }
}
