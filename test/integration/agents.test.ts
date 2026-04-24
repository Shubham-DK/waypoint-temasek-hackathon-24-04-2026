describe('agent storage', () => {
  it('can save agents to chrome storage', async () => {
    const agents = [
      { id: 1, name: 'Test', role: 'test', systemPrompt: 'test', maxTokens: 400 },
    ];
    await chrome.storage.local.set({ wp_agents: agents });
    const { wp_agents } = await chrome.storage.local.get('wp_agents');
    expect(wp_agents).toHaveLength(1);
    expect((wp_agents as { role: string }[])[0].role).toBe('test');
  });

  it('handles empty storage gracefully', async () => {
    const { wp_agents } = await chrome.storage.local.get('wp_agents');
    expect(wp_agents).toBeUndefined();
  });

  it('can store multiple agents', async () => {
    const agents = [
      { id: 1, name: 'Orchestrator', role: 'orchestrator', systemPrompt: 'test', maxTokens: 400 },
      { id: 2, name: 'Site Selector', role: 'site_selector', systemPrompt: 'test', maxTokens: 600 },
      { id: 3, name: 'Plan Generator', role: 'plan_generator', systemPrompt: 'test', maxTokens: 2048 },
    ];
    await chrome.storage.local.set({ wp_agents: agents });
    const { wp_agents } = await chrome.storage.local.get('wp_agents');
    expect(wp_agents).toHaveLength(3);
  });

  it('can update agent list', async () => {
    await chrome.storage.local.set({ wp_agents: [{ id: 1, role: 'test' }] });
    const updated = [{ id: 1, role: 'test' }, { id: 2, role: 'new' }];
    await chrome.storage.local.set({ wp_agents: updated });
    const { wp_agents } = await chrome.storage.local.get('wp_agents');
    expect(wp_agents).toHaveLength(2);
  });
});
