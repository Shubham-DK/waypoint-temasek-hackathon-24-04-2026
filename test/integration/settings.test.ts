// @vitest-environment jsdom
import { config } from '@/config';
import { seedStorage } from '../chrome-mock';

beforeEach(() => {
  config.CLAUDE_API_KEY = '';
  config.CLAUDE_MODEL = 'claude-sonnet-4-6';
});

describe('config defaults', () => {
  it('has empty API key by default', () => {
    expect(config.CLAUDE_API_KEY).toBe('');
  });

  it('has default model set', () => {
    expect(config.CLAUDE_MODEL).toBe('claude-sonnet-4-6');
  });

  it('config can be mutated', () => {
    config.CLAUDE_API_KEY = 'sk-ant-test-key';
    expect(config.CLAUDE_API_KEY).toBe('sk-ant-test-key');
  });

  it('storage mock works for settings', async () => {
    seedStorage({
      wp_settings: { claudeKey: 'sk-ant-stored', claudeModel: 'claude-sonnet-4-6', piiMask: false },
    });
    const { wp_settings } = await chrome.storage.local.get('wp_settings');
    expect(wp_settings).toBeDefined();
    expect((wp_settings as Record<string, string>).claudeKey).toBe('sk-ant-stored');
  });

  it('can save settings to storage', async () => {
    await chrome.storage.local.set({
      wp_settings: { claudeKey: 'sk-ant-new', claudeModel: 'claude-sonnet-4-6', piiMask: true },
    });
    expect(chrome.storage.local.set).toHaveBeenCalledWith(
      expect.objectContaining({
        wp_settings: expect.objectContaining({ claudeKey: 'sk-ant-new' }),
      })
    );
  });
});
