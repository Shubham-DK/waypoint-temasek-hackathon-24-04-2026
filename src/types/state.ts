import type { KBDocument, AgentDef, ActionPlan } from './actions';
import type { RecordedAction, TabInfo } from './messages';

export interface AppState {
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  kbDocuments: KBDocument[];
  agentDefs: AgentDef[];
  recordedActions: RecordedAction[];
  isRecording: boolean;
  isAgentRunning: boolean;
  piiMaskEnabled: boolean;
  pendingPlan: ActionPlan | null;
  pendingResume: ((value: string) => void) | null;
  pollInterval: ReturnType<typeof setInterval> | null;
  variables: Record<string, string>;
  openTabs: TabInfo[];
  pendingScenario: boolean;
}
