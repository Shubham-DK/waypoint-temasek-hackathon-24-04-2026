import type { ActionPlan } from '../types/actions';

export function tryParseActionPlan(text: string): ActionPlan | null {
  // Match the opening brace of an action_plan JSON object, tolerating any
  // whitespace between { and "type" (Claude often outputs pretty-printed JSON).
  const match = text.match(/\{\s*"type"\s*:\s*"action_plan"/);
  if (!match || match.index === undefined) return null;

  const idx = match.index;
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = idx; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) {
        try {
          const parsed = JSON.parse(text.slice(idx, i + 1));
          if (parsed.type === 'action_plan' && Array.isArray(parsed.steps)) {
            return parsed as ActionPlan;
          }
        } catch { return null; }
        return null;
      }
    }
  }
  return null;
}
