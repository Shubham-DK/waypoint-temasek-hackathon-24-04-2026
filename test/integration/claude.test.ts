import { claudeCall } from '@/sidepanel/claude';
import { config } from '@/config';

describe('claudeCall', () => {
  it('throws if API key is not set', async () => {
    config.CLAUDE_API_KEY = '';
    await expect(
      claudeCall({ messages: [{ role: 'user', content: 'hi' }], system: 'test' })
    ).rejects.toThrow('Invalid Claude API key');
  });

  it('throws if API key does not start with sk-ant-', async () => {
    config.CLAUDE_API_KEY = 'bad-key';
    await expect(
      claudeCall({ messages: [{ role: 'user', content: 'hi' }], system: 'test' })
    ).rejects.toThrow('Invalid Claude API key');
  });

  it('calls the Anthropic API with correct headers', async () => {
    config.CLAUDE_API_KEY = 'sk-ant-test-key-123';
    config.CLAUDE_MODEL = 'claude-sonnet-4-6';

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ content: [{ type: 'text', text: 'Hello!' }], stop_reason: 'end_turn' }),
    });
    globalThis.fetch = mockFetch;

    const result = await claudeCall({
      messages: [{ role: 'user', content: 'hi' }],
      system: 'Be brief',
    });

    expect(result).toBe('Hello!');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-api-key': 'sk-ant-test-key-123',
          'anthropic-dangerous-direct-browser-access': 'true',
        }),
      })
    );
  });

  it('sends the correct model and max_tokens', async () => {
    config.CLAUDE_API_KEY = 'sk-ant-test-key-123';
    config.CLAUDE_MODEL = 'claude-sonnet-4-6';

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ content: [{ type: 'text', text: 'ok' }], stop_reason: 'end_turn' }),
    });
    globalThis.fetch = mockFetch;

    await claudeCall({
      messages: [{ role: 'user', content: 'hi' }],
      system: 'test',
      maxTokens: 500,
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.model).toBe('claude-sonnet-4-6');
    expect(body.max_tokens).toBe(500);
  });

  it('throws on non-200 response', async () => {
    config.CLAUDE_API_KEY = 'sk-ant-test-key-123';
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: () => Promise.resolve('rate limited'),
    });

    await expect(
      claudeCall({ messages: [{ role: 'user', content: 'hi' }], system: 'test' })
    ).rejects.toThrow('Claude API 429');
  });
});
