// MCP types for the Waypoint Chrome Extension

export interface MCPServerConfig {
  id: string;
  name: string;
  url: string;
  description: string;
  icon: string; // Lucide icon name
}

export type MCPConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'failed';

export interface MCPTool {
  name: string;             // prefixed: servername__toolname
  description: string;
  input_schema: Record<string, unknown>;
}

export interface MCPConnection {
  config: MCPServerConfig;
  status: MCPConnectionStatus;
  tools: MCPTool[];
  error?: string;
  toolsExpanded?: boolean;
}
