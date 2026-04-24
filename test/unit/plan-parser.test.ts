import { tryParseActionPlan } from '@/sidepanel/plan-parser';

describe('tryParseActionPlan', () => {
  it('parses valid action plan JSON from Claude response', () => {
    const text = 'Here is the plan: {"type":"action_plan","summary":"Test","steps":[{"action":"click","selector":"#btn","description":"Click it"}]}';
    const plan = tryParseActionPlan(text);
    expect(plan).not.toBeNull();
    expect(plan!.type).toBe('action_plan');
    expect(plan!.steps).toHaveLength(1);
    expect(plan!.steps[0].action).toBe('click');
  });

  it('parses with spaces in JSON keys', () => {
    const text = '{ "type": "action_plan", "summary": "Test", "steps": [{ "action": "fill", "selector": "#x", "value": "hello", "description": "Fill" }] }';
    const plan = tryParseActionPlan(text);
    expect(plan).not.toBeNull();
    expect(plan!.steps[0].value).toBe('hello');
  });

  it('returns null for plain text responses', () => {
    expect(tryParseActionPlan('This page is about hotels.')).toBeNull();
  });

  it('returns null for malformed JSON', () => {
    expect(tryParseActionPlan('{"type":"action_plan", broken')).toBeNull();
  });

  it('returns null if type is not action_plan', () => {
    expect(tryParseActionPlan('{"type":"other","steps":[]}')).toBeNull();
  });

  it('returns null if steps is not an array', () => {
    expect(tryParseActionPlan('{"type":"action_plan","summary":"X","steps":"nope"}')).toBeNull();
  });

  it('handles nested braces in step values', () => {
    const text = '{"type":"action_plan","summary":"Test","steps":[{"action":"fill","selector":"#x","value":"obj = {}","description":"Fill"}]}';
    const plan = tryParseActionPlan(text);
    expect(plan).not.toBeNull();
    expect(plan!.steps[0].value).toBe('obj = {}');
  });

  it('extracts plan embedded in surrounding text', () => {
    const text = 'Sure! Here is your plan:\n\n{"type":"action_plan","summary":"Navigate","steps":[{"action":"navigate","url":"http://example.com","description":"Go"}]}\n\nLet me know if you need changes.';
    const plan = tryParseActionPlan(text);
    expect(plan).not.toBeNull();
    expect(plan!.summary).toBe('Navigate');
  });
});
