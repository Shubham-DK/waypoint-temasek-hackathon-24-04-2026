import type { PageContent, RecordedAction } from './messages';

export interface ActionStep {
  action: 'navigate' | 'click' | 'fill' | 'switch_tab' | 'read_tab' |
          'open_tab' | 'ask_user' | 'confirm' | 'wait';
  selector?: string;
  url?: string;
  url_pattern?: string;
  value?: string;
  question?: string;
  variableName?: string;
  ms?: number;
  description: string;
}

export interface ActionPlan {
  type: 'action_plan';
  summary: string;
  steps: ActionStep[];
}

export interface Workflow {
  id: number;
  name: string;
  actions: RecordedAction[];
  savedAt: string;
  source: 'recording' | 'ai-plan' | 'manual';
}

export interface KBDocument {
  id: number;
  name: string;
  content: string;
}

export interface AgentDef {
  id: number;
  name: string;
  role: string;
  systemPrompt: string;
  maxTokens: number;
  model?: string;
}

export interface IdentifiedSite {
  url: string;
  name: string;
  purpose: string;
}

export interface TabContext {
  url: string;
  pageContent: PageContent | null;
  dataFields: Record<string, string>;
  pageInsight: string;
}
