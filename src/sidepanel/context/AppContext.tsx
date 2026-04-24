import { createContext, useContext, useReducer, useRef, type ReactNode, type Dispatch, type MutableRefObject } from 'react';
import type { KBDocument, AgentDef, ActionPlan, Workflow } from '../../types/actions';
import type { RecordedAction, TabInfo } from '../../types/messages';
import type { MCPConnection, MCPTool } from '../mcp/types';

// --- Chat Message type ---
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  hasPII?: boolean;
}

// --- Panel keys ---
export type PanelKey = 'wf' | 'ds' | 'agents' | 'kb' | 'settings' | 'mcp' | 'perf' | null;

// --- App State ---
export interface AppState {
  messages: ChatMessage[];
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  kbDocuments: KBDocument[];
  agentDefs: AgentDef[];
  recordedActions: RecordedAction[];
  isRecording: boolean;
  isAgentRunning: boolean;
  piiMaskEnabled: boolean;
  pendingPlan: ActionPlan | null;
  status: 'idle' | 'recording' | 'busy' | 'done';
  spinnerLabel: string | null;
  activePanel: PanelKey;
  variables: Record<string, string>;
  openTabs: TabInfo[];
  pendingScenario: boolean;
  workflows: Workflow[];
  csvData: Record<string, string>[];
  csvMappings: Record<string, string>;
  mcpConnections: MCPConnection[];
  mcpTools: MCPTool[];
}

// --- Actions ---
export type AppAction =
  | { type: 'ADD_MESSAGE'; message: ChatMessage }
  | { type: 'UPDATE_MESSAGE'; id: string; content: string }
  | { type: 'SET_STATUS'; status: AppState['status'] }
  | { type: 'SHOW_SPINNER'; label: string }
  | { type: 'HIDE_SPINNER' }
  | { type: 'SET_PENDING_PLAN'; plan: ActionPlan }
  | { type: 'CLEAR_PENDING_PLAN' }
  | { type: 'SET_ACTIVE_PANEL'; panel: PanelKey }
  | { type: 'SET_KB_DOCUMENTS'; docs: KBDocument[] }
  | { type: 'ADD_KB_DOCUMENT'; doc: KBDocument }
  | { type: 'REMOVE_KB_DOCUMENT'; id: number }
  | { type: 'SET_AGENT_DEFS'; agents: AgentDef[] }
  | { type: 'ADD_AGENT'; agent: AgentDef }
  | { type: 'REMOVE_AGENT'; id: number }
  | { type: 'UPDATE_AGENT'; id: number; changes: Partial<AgentDef> }
  | { type: 'SET_RECORDING'; isRecording: boolean }
  | { type: 'SET_RECORDED_ACTIONS'; actions: RecordedAction[] }
  | { type: 'SET_SETTINGS'; piiMaskEnabled: boolean }
  | { type: 'SET_VARIABLES'; variables: Record<string, string> }
  | { type: 'MERGE_VARIABLES'; variables: Record<string, string> }
  | { type: 'SET_OPEN_TABS'; tabs: TabInfo[] }
  | { type: 'SET_PENDING_SCENARIO'; pending: boolean }
  | { type: 'SET_WORKFLOWS'; workflows: Workflow[] }
  | { type: 'ADD_WORKFLOW'; workflow: Workflow }
  | { type: 'REMOVE_WORKFLOW'; id: number }
  | { type: 'SET_CSV_DATA'; data: Record<string, string>[] }
  | { type: 'SET_CSV_MAPPINGS'; mappings: Record<string, string> }
  | { type: 'SET_AGENT_RUNNING'; running: boolean }
  | { type: 'PUSH_CONVERSATION'; entry: { role: 'user' | 'assistant'; content: string } }
  | { type: 'TRIM_CONVERSATION' }
  | { type: 'CLEAR_CHAT' }
  | { type: 'SET_MCP_CONNECTIONS'; connections: MCPConnection[] }
  | { type: 'UPDATE_MCP_CONNECTION'; id: string; changes: Partial<MCPConnection> }
  | { type: 'SET_MCP_TOOLS'; tools: MCPTool[] };

// --- Initial State ---
const initialState: AppState = {
  messages: [],
  conversationHistory: [],
  kbDocuments: [],
  agentDefs: [],
  recordedActions: [],
  isRecording: false,
  isAgentRunning: false,
  piiMaskEnabled: true,
  pendingPlan: null,
  status: 'idle',
  spinnerLabel: null,
  activePanel: null,
  variables: {},
  openTabs: [],
  pendingScenario: false,
  workflows: [],
  csvData: [],
  csvMappings: {},
  mcpConnections: [],
  mcpTools: [],
};

// --- Reducer ---
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.message] };
    case 'UPDATE_MESSAGE':
      return {
        ...state,
        messages: state.messages.map(m =>
          m.id === action.id ? { ...m, content: action.content } : m
        ),
      };
    case 'SET_STATUS':
      return { ...state, status: action.status };
    case 'SHOW_SPINNER':
      return { ...state, spinnerLabel: action.label };
    case 'HIDE_SPINNER':
      return { ...state, spinnerLabel: null };
    case 'SET_PENDING_PLAN':
      return { ...state, pendingPlan: action.plan };
    case 'CLEAR_PENDING_PLAN':
      return { ...state, pendingPlan: null };
    case 'SET_ACTIVE_PANEL':
      return { ...state, activePanel: state.activePanel === action.panel ? null : action.panel };
    case 'SET_KB_DOCUMENTS':
      return { ...state, kbDocuments: action.docs };
    case 'ADD_KB_DOCUMENT':
      return { ...state, kbDocuments: [...state.kbDocuments, action.doc] };
    case 'REMOVE_KB_DOCUMENT':
      return { ...state, kbDocuments: state.kbDocuments.filter(d => d.id !== action.id) };
    case 'SET_AGENT_DEFS':
      return { ...state, agentDefs: action.agents };
    case 'ADD_AGENT':
      return { ...state, agentDefs: [...state.agentDefs, action.agent] };
    case 'REMOVE_AGENT':
      return { ...state, agentDefs: state.agentDefs.filter(a => a.id !== action.id) };
    case 'UPDATE_AGENT':
      return {
        ...state,
        agentDefs: state.agentDefs.map(a =>
          a.id === action.id ? { ...a, ...action.changes } : a
        ),
      };
    case 'SET_RECORDING':
      return { ...state, isRecording: action.isRecording };
    case 'SET_RECORDED_ACTIONS':
      return { ...state, recordedActions: action.actions };
    case 'SET_SETTINGS':
      return { ...state, piiMaskEnabled: action.piiMaskEnabled };
    case 'SET_VARIABLES':
      return { ...state, variables: action.variables };
    case 'MERGE_VARIABLES':
      return { ...state, variables: { ...state.variables, ...action.variables } };
    case 'SET_OPEN_TABS':
      return { ...state, openTabs: action.tabs };
    case 'SET_PENDING_SCENARIO':
      return { ...state, pendingScenario: action.pending };
    case 'SET_WORKFLOWS':
      return { ...state, workflows: action.workflows };
    case 'ADD_WORKFLOW':
      return { ...state, workflows: [...state.workflows, action.workflow] };
    case 'REMOVE_WORKFLOW':
      return { ...state, workflows: state.workflows.filter(w => w.id !== action.id) };
    case 'SET_CSV_DATA':
      return { ...state, csvData: action.data };
    case 'SET_CSV_MAPPINGS':
      return { ...state, csvMappings: action.mappings };
    case 'SET_AGENT_RUNNING':
      return { ...state, isAgentRunning: action.running };
    case 'PUSH_CONVERSATION':
      return { ...state, conversationHistory: [...state.conversationHistory, action.entry] };
    case 'TRIM_CONVERSATION':
      return { ...state, conversationHistory: state.conversationHistory.slice(-20) };
    case 'CLEAR_CHAT':
      return { ...state, messages: [], conversationHistory: [], pendingPlan: null, pendingScenario: false, variables: {} };
    case 'SET_MCP_CONNECTIONS':
      return { ...state, mcpConnections: action.connections };
    case 'UPDATE_MCP_CONNECTION':
      return {
        ...state,
        mcpConnections: state.mcpConnections.map(c =>
          c.config.id === action.id ? { ...c, ...action.changes } : c
        ),
      };
    case 'SET_MCP_TOOLS':
      return { ...state, mcpTools: action.tools };
    default:
      return state;
  }
}

// --- Context ---
interface AppContextValue {
  state: AppState;
  dispatch: Dispatch<AppAction>;
  pendingResumeRef: MutableRefObject<((value: string) => void) | null>;
  pollIntervalRef: MutableRefObject<ReturnType<typeof setInterval> | null>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const pendingResumeRef = useRef<((value: string) => void) | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  return (
    <AppContext.Provider value={{ state, dispatch, pendingResumeRef, pollIntervalRef }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

// --- Helper: generate message ID ---
let msgCounter = 0;
export function msgId(): string {
  return `msg-${++msgCounter}`;
}
