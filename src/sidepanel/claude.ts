import { config } from '../config';
import type { MCPTool } from './mcp/types';

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string | ClaudeContentBlock[];
}

interface ClaudeContentBlock {
  type: string;
  [key: string]: unknown;
}

interface ClaudeCallParams {
  messages: ClaudeMessage[];
  system: string;
  maxTokens?: number;
  tools?: MCPTool[];
  model?: string;
}

export interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ClaudeResponse {
  text: string | null;
  toolUse: ToolUseBlock[];
  stopReason: string;
}

function buildAnthropicTool(t: MCPTool) {
  return {
    name: t.name,
    description: t.description,
    input_schema: t.input_schema,
  };
}

export async function fetchModels(apiKey: string): Promise<{ id: string; display_name: string }[]> {
  if (!apiKey.startsWith('sk-ant-')) return [];
  try {
    const resp = await fetch('https://api.anthropic.com/v1/models', {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    return (data.data ?? []) as { id: string; display_name: string }[];
  } catch {
    return [];
  }
}

export async function claudeCall(params: {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  system: string;
  maxTokens?: number;
  model?: string;
}): Promise<string> {
  const resp = await _rawCall({
    messages: params.messages,
    system: params.system,
    maxTokens: params.maxTokens,
    model: params.model,
  });
  const text = resp.text;
  if (!text) throw new Error('Claude returned no text content');
  return text;
}

export async function claudeCallWithTools(params: ClaudeCallParams): Promise<ClaudeResponse> {
  return _rawCall(params);
}

async function _rawCall(params: ClaudeCallParams): Promise<ClaudeResponse> {
  if (!config.CLAUDE_API_KEY.startsWith('sk-ant-')) {
    throw new Error('Invalid Claude API key. Set it in Settings.');
  }

  const body: Record<string, unknown> = {
    model: params.model || config.CLAUDE_MODEL,
    max_tokens: params.maxTokens ?? 8096,
    system: params.system,
    messages: params.messages,
  };

  if (params.tools && params.tools.length > 0) {
    body.tools = params.tools.map(buildAnthropicTool);
  }

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Claude API ${resp.status}: ${err}`);
  }

  const data = await resp.json();
  const content: ClaudeContentBlock[] = data.content ?? [];

  const textBlock = content.find(b => b.type === 'text');
  const toolUseBlocks = content.filter(b => b.type === 'tool_use') as unknown as ToolUseBlock[];

  return {
    text: textBlock ? (textBlock.text as string) : null,
    toolUse: toolUseBlocks,
    stopReason: data.stop_reason ?? 'end_turn',
  };
}
