import type { MCPServerConfig } from './types';

export const MCP_SERVERS: MCPServerConfig[] = [
  {
    id: 'jira',
    name: 'Jira',
    url: 'https://jira.mcp.sq.com.sg/mcp',
    description: 'Search issues, create tickets, update status, and manage Jira projects.',
    icon: 'Ticket',
  },
  {
    id: 'bitbucket',
    name: 'Bitbucket',
    url: 'https://bitbucket.mcp.sq.com.sg/mcp',
    description: 'Browse repos, view pull requests, and access code from Bitbucket.',
    icon: 'GitBranch',
  },
  {
    id: 'confluence',
    name: 'Confluence',
    url: 'https://confluence.mcp.sq.com.sg/mcp',
    description: 'Search and read Confluence pages, spaces, and documentation.',
    icon: 'FileText',
  },
  {
    id: 'siacontext',
    name: 'SIA Context',
    url: 'https://siacontext.mcp.sq.com.sg/mcp',
    description: 'Access SIA internal context, operational data, and airline systems.',
    icon: 'Database',
  },
];

/** Convert a server ID or name to a normalized string safe for tool name prefixing */
export function normalizeServerId(id: string): string {
  return id.toLowerCase().replace(/[^a-z0-9]/g, '');
}
