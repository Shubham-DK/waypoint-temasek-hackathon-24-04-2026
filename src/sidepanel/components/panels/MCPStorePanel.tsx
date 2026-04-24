import { useState } from 'react';
import { Ticket, GitBranch, FileText, Database, ChevronDown, ChevronRight, Plug, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { MCP_SERVERS } from '../../mcp/servers';
import { getConnectionManager, removeConnectionManager } from '../../mcp/connection';
import type { MCPConnection, MCPTool } from '../../mcp/types';

const SERVER_ICONS: Record<string, React.ReactNode> = {
  Ticket: <Ticket size={18} />,
  GitBranch: <GitBranch size={18} />,
  FileText: <FileText size={18} />,
  Database: <Database size={18} />,
};

const STATUS_STYLES: Record<string, string> = {
  disconnected: 'text-slate-500',
  connecting: 'text-yellow-400 animate-pulse',
  connected: 'text-emerald-400',
  failed: 'text-red-400',
};

const STATUS_DOT: Record<string, string> = {
  disconnected: 'bg-slate-600',
  connecting: 'bg-yellow-400 animate-pulse',
  connected: 'bg-emerald-400',
  failed: 'bg-red-400',
};

export function MCPStorePanel() {
  const { state, dispatch } = useApp();
  const [expandedServers, setExpandedServers] = useState<Record<string, boolean>>({});

  if (state.activePanel !== 'mcp') return null;

  function getConnection(id: string): MCPConnection | undefined {
    return state.mcpConnections.find(c => c.config.id === id);
  }

  function toggleExpand(id: string) {
    setExpandedServers(prev => ({ ...prev, [id]: !prev[id] }));
  }

  async function handleConnect(serverId: string) {
    const serverConfig = MCP_SERVERS.find(s => s.id === serverId);
    if (!serverConfig) return;

    // Ensure connection record exists
    const existing = getConnection(serverId);
    if (!existing) {
      const newConn: MCPConnection = { config: serverConfig, status: 'connecting', tools: [] };
      dispatch({ type: 'SET_MCP_CONNECTIONS', connections: [...state.mcpConnections, newConn] });
    } else {
      dispatch({ type: 'UPDATE_MCP_CONNECTION', id: serverId, changes: { status: 'connecting', error: undefined } });
    }

    const manager = getConnectionManager(serverConfig);
    manager.setReconnectCallback(async () => {
      // Called after OAuth completes — re-attempt connection
      handleConnect(serverId);
    });

    try {
      const tools: MCPTool[] = await manager.connect();
      // UPDATE_MCP_CONNECTION triggers the useEffect in App.tsx that rebuilds mcpTools
      dispatch({ type: 'UPDATE_MCP_CONNECTION', id: serverId, changes: { status: 'connected', tools, error: undefined } });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      dispatch({ type: 'UPDATE_MCP_CONNECTION', id: serverId, changes: { status: 'failed', error: msg } });
    }
  }

  async function handleDisconnect(serverId: string) {
    removeConnectionManager(serverId);
    // The useEffect in App.tsx watches mcpConnections and will clear this server's tools from mcpTools
    dispatch({ type: 'UPDATE_MCP_CONNECTION', id: serverId, changes: { status: 'disconnected', tools: [], error: undefined } });
  }

  return (
    <aside className="absolute inset-0 top-[48px] bg-surface-base z-20 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
        <div className="flex items-center gap-2 text-slate-200 font-semibold">
          <Plug size={16} className="text-emerald-400" />
          <span>MCP Store</span>
        </div>
        <button
          onClick={() => dispatch({ type: 'SET_ACTIVE_PANEL', panel: 'mcp' })}
          className="text-slate-500 hover:text-slate-300 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Server list */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {MCP_SERVERS.map(server => {
          const conn = getConnection(server.id);
          const status = conn?.status ?? 'disconnected';
          const tools = conn?.tools ?? [];
          const isExpanded = expandedServers[server.id];
          const isConnected = status === 'connected';
          const isConnecting = status === 'connecting';

          return (
            <div
              key={server.id}
              className="bg-surface-card rounded-lg border border-slate-700/50 overflow-hidden"
            >
              {/* Card top */}
              <div className="flex items-start gap-3 p-3">
                <div className="mt-0.5 text-slate-400 shrink-0">
                  {SERVER_ICONS[server.icon]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-200 font-medium text-sm">{server.name}</span>
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[status]}`} />
                    <span className={`text-xs ${STATUS_STYLES[status]}`}>{status}</span>
                    {isConnected && tools.length > 0 && (
                      <span className="ml-auto text-xs bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full font-medium">
                        {tools.length} tools
                      </span>
                    )}
                  </div>
                  <p className="text-slate-500 text-xs mt-1 leading-relaxed">{server.description}</p>
                  {conn?.error && (
                    <p className="text-red-400 text-xs mt-1 break-words">{conn.error}</p>
                  )}
                </div>
              </div>

              {/* Action row */}
              <div className="flex items-center gap-2 px-3 pb-3">
                {isConnected ? (
                  <button
                    onClick={() => handleDisconnect(server.id)}
                    className="text-xs px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={() => handleConnect(server.id)}
                    disabled={isConnecting}
                    className="text-xs px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white transition-colors"
                  >
                    {isConnecting ? 'Connecting…' : 'Connect'}
                  </button>
                )}

                {isConnected && tools.length > 0 && (
                  <button
                    onClick={() => toggleExpand(server.id)}
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors ml-auto"
                  >
                    {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    {isExpanded ? 'Hide tools' : 'Show tools'}
                  </button>
                )}
              </div>

              {/* Tool list */}
              {isExpanded && tools.length > 0 && (
                <div className="border-t border-slate-700/50 px-3 py-2 space-y-1 max-h-48 overflow-y-auto">
                  {tools.map(tool => (
                    <div key={tool.name} className="text-xs">
                      <span className="font-mono text-emerald-300">{tool.name}</span>
                      {tool.description && (
                        <span className="text-slate-500 ml-2">{tool.description}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer: connected tools summary */}
      {state.mcpTools.length > 0 && (
        <div className="px-4 py-2 border-t border-slate-700/50 text-xs text-slate-500">
          {state.mcpTools.length} tool{state.mcpTools.length !== 1 ? 's' : ''} injected into Claude
        </div>
      )}
    </aside>
  );
}
