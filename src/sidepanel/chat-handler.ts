import type { Dispatch, MutableRefObject } from 'react';
import type { AppState, AppAction } from './context/AppContext';
import { msgId } from './context/AppContext';
import type { PageContent } from '../types/messages';
import { claudeCallWithTools, type ToolUseBlock } from './claude';
import { buildSystemPrompt } from './system-prompt';
import { tryParseActionPlan } from './plan-parser';
import { executePlan } from './executor';
import { getOpenTabs } from './cross-tab';
import { kbContextFor } from './kb';
import { maskPII } from './pii';
import { getConnectionManager } from './mcp/connection';
import { MCP_SERVERS } from './mcp/servers';
import type { ActionPlan } from '../types/actions';

/** Plans that only contain these action types are safe to auto-execute. */
const AUTO_EXECUTE_ACTIONS = new Set(['navigate', 'open_tab', 'switch_tab', 'wait']);

function isSimplePlan(plan: ActionPlan): boolean {
  return plan.steps.every(s => AUTO_EXECUTE_ACTIONS.has(s.action));
}

const MAX_TOOL_ITERATIONS = 10;

function getPageContent(): Promise<PageContent> {
  return new Promise(resolve => {
    chrome.runtime.sendMessage(
      { type: 'EXECUTE_ACTION', action: 'getPageContent' },
      (result) => resolve(result as PageContent)
    );
  });
}

function formatPageContext(pc: PageContent): string {
  if (!pc || !pc.url) return '(no page context available)';
  const parts = [`URL: ${pc.url}`, `Title: ${pc.title}`];
  if (pc.headings?.length) parts.push(`Headings:\n${pc.headings.join('\n')}`);
  if (pc.inputs?.length) parts.push(`Inputs:\n${pc.inputs.join('\n')}`);
  if (pc.buttons?.length) parts.push(`Buttons:\n${pc.buttons.join('\n')}`);
  if (pc.links?.length) parts.push(`Links:\n${pc.links.join('\n')}`);
  if (pc.bodyText) parts.push(`Page Text:\n${pc.bodyText.slice(0, 2000)}`);
  return parts.join('\n\n');
}

/** Execute an MCP tool and return the result as a string */
async function executeMcpTool(toolName: string, toolInput: Record<string, unknown>): Promise<string> {
  // Tool name is prefixed: serverId__toolname — find which server owns it
  const server = MCP_SERVERS.find(s => toolName.startsWith(s.id + '__'));
  if (!server) {
    return JSON.stringify({ error: `No MCP server found for tool: ${toolName}` });
  }

  try {
    const manager = getConnectionManager(server);
    const result = await manager.callTool(toolName, toolInput);
    if (result.isError) {
      return JSON.stringify({ error: result.content });
    }
    // Flatten content blocks to a single string
    const text = result.content
      .map(block => (block.text ?? JSON.stringify(block)))
      .join('\n');
    return text;
  } catch (err) {
    return JSON.stringify({ error: err instanceof Error ? err.message : String(err) });
  }
}

type ConversationMessage =
  | { role: 'user' | 'assistant'; content: string }
  | { role: 'user'; content: Array<{ type: 'tool_result'; tool_use_id: string; content: string }> }
  | { role: 'assistant'; content: Array<{ type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }> };

export async function handleSend(
  userText: string,
  state: AppState,
  dispatch: Dispatch<AppAction>,
  pendingResumeRef: MutableRefObject<((value: string) => void) | null>
): Promise<void> {
  dispatch({ type: 'SET_STATUS', status: 'busy' });
  dispatch({ type: 'SHOW_SPINNER', label: 'Thinking...' });
  dispatch({ type: 'SET_AGENT_RUNNING', running: true });

  try {
    const [pageContent, openTabs] = await Promise.all([
      getPageContent(),
      getOpenTabs(),
    ]);
    dispatch({ type: 'SET_OPEN_TABS', tabs: openTabs });

    let pageContext = formatPageContext(pageContent);
    let safeText = userText;
    if (state.piiMaskEnabled) {
      pageContext = maskPII(pageContext);
      safeText = maskPII(userText);
    }

    const kbCtx = kbContextFor(userText, state.kbDocuments);
    dispatch({ type: 'PUSH_CONVERSATION', entry: { role: 'user', content: safeText } });
    dispatch({ type: 'TRIM_CONVERSATION' });

    const system = buildSystemPrompt(pageContext, kbCtx, openTabs);

    // Build the initial conversation messages
    const baseHistory = [...state.conversationHistory, { role: 'user' as const, content: safeText }].slice(-20);
    const messages: ConversationMessage[] = baseHistory;

    const mcpTools = state.mcpTools;
    let finalText: string | null = null;

    // Agent loop — runs until Claude stops using tools (or we hit the iteration cap)
    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
      const response = await claudeCallWithTools({
        messages: messages as Parameters<typeof claudeCallWithTools>[0]['messages'],
        system,
        tools: mcpTools.length > 0 ? mcpTools : undefined,
      });

      if (response.stopReason !== 'tool_use' || response.toolUse.length === 0) {
        // Claude is done using tools — we have the final text response
        finalText = response.text;
        break;
      }

      // Claude wants to use tools — show user what's happening
      const toolNames = response.toolUse.map((t: ToolUseBlock) => t.name).join(', ');
      dispatch({
        type: 'ADD_MESSAGE',
        message: {
          id: msgId(),
          role: 'system',
          content: `Using tools: ${toolNames}`,
        },
      });
      dispatch({ type: 'SHOW_SPINNER', label: `Running ${response.toolUse.length} tool(s)…` });

      // Add Claude's tool_use turn to the conversation
      messages.push({
        role: 'assistant',
        content: response.toolUse.map((t: ToolUseBlock) => ({
          type: 'tool_use' as const,
          id: t.id,
          name: t.name,
          input: t.input,
        })),
      });

      // Execute each tool and collect results
      const toolResults = await Promise.all(
        response.toolUse.map(async (toolUse: ToolUseBlock) => {
          const result = await executeMcpTool(toolUse.name, toolUse.input);
          return {
            type: 'tool_result' as const,
            tool_use_id: toolUse.id,
            content: result,
          };
        })
      );

      // Add tool results back as a user message
      messages.push({ role: 'user', content: toolResults });
    }

    // If we exhausted iterations without a text response
    if (finalText === null) {
      finalText = '(Agent reached maximum tool call iterations without a final response.)';
    }

    const plan = tryParseActionPlan(finalText);
    dispatch({ type: 'PUSH_CONVERSATION', entry: { role: 'assistant', content: finalText } });

    if (plan) {
      if (isSimplePlan(plan)) {
        // Simple navigate/open_tab plans — execute immediately, no approval needed.
        dispatch({
          type: 'ADD_MESSAGE',
          message: { id: msgId(), role: 'system', content: `Executing: ${plan.summary}` },
        });
        executePlan(plan, dispatch, pendingResumeRef);
      } else {
        // Multi-step or destructive plan — show approval card so user can review.
        dispatch({ type: 'SET_PENDING_PLAN', plan });
      }
    } else {
      dispatch({ type: 'ADD_MESSAGE', message: { id: msgId(), role: 'assistant', content: finalText } });
    }
  } catch (err) {
    dispatch({ type: 'ADD_MESSAGE', message: { id: msgId(), role: 'assistant', content: `Error: ${err}` } });
  } finally {
    dispatch({ type: 'HIDE_SPINNER' });
    dispatch({ type: 'SET_STATUS', status: 'idle' });
    dispatch({ type: 'SET_AGENT_RUNNING', running: false });
  }
}
