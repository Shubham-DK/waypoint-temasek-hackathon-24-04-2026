import { subVars } from '@/sidepanel/cross-tab';

const variables = {
  'passenger-name': 'James Lim',
  'passenger-email': 'james@example.com',
};

describe('subVars', () => {
  it('replaces {{variable}} with value', () => {
    expect(subVars('Hello {{passenger-name}}', variables)).toBe('Hello James Lim');
  });

  it('replaces multiple variables in one string', () => {
    const result = subVars('Name: {{passenger-name}}, Email: {{passenger-email}}', variables);
    expect(result).toBe('Name: James Lim, Email: james@example.com');
  });

  it('leaves {{unknown}} as-is when variable not found', () => {
    expect(subVars('{{unknown-var}}', variables)).toBe('{{unknown-var}}');
  });

  it('returns null/undefined unchanged', () => {
    expect(subVars(undefined as unknown as string, variables)).toBeUndefined();
    expect(subVars(null as unknown as string, variables)).toBeNull();
  });

  it('returns strings with no variables unchanged', () => {
    expect(subVars('plain text', variables)).toBe('plain text');
  });
});
