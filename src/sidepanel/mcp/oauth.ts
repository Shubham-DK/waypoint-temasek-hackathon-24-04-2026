// Chrome Extension OAuth provider for MCP servers
// Key differences from the web example-remote-client:
//   - chrome.tabs.create() instead of window.open()
//   - chrome.storage.local instead of localStorage
//   - chrome.tabs.onUpdated to capture OAuth callback redirect

import type { OAuthClientProvider } from '@modelcontextprotocol/sdk/client/auth.js';
import { auth } from '@modelcontextprotocol/sdk/client/auth.js';

// Interfaces matching the MCP SDK's internal types
interface OAuthClientMetadata {
  redirect_uris: string[];
  grant_types?: string[];
  response_types?: string[];
  client_name?: string;
  token_endpoint_auth_method?: string;
}

interface OAuthClientInformation {
  client_id: string;
  client_secret?: string;
  registration_access_token?: string;
  registration_client_uri?: string;
  client_secret_expires_at?: number;
}

interface OAuthTokens {
  access_token: string;
  token_type: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
}

// Redirect URL that Chrome extension OAuth servers redirect back to.
// Must be registered with each MCP server's OAuth provider.
// Chrome extension sidepanels don't have a stable URL, so we use a known callback host.
const OAUTH_CALLBACK_ORIGIN = 'https://mcp.sq.com.sg';
const OAUTH_CALLBACK_PATH = '/oauth/callback';

function storageGet(key: string): Promise<string | undefined> {
  return new Promise(resolve => {
    chrome.storage.local.get([key], result => {
      resolve(result[key] as string | undefined);
    });
  });
}

function storageSet(key: string, value: string): Promise<void> {
  return new Promise(resolve => {
    chrome.storage.local.set({ [key]: value }, resolve);
  });
}

function storageRemove(key: string): Promise<void> {
  return new Promise(resolve => {
    chrome.storage.local.remove([key], resolve);
  });
}

function serverKey(serverUrl: string): string {
  try {
    const url = new URL(serverUrl);
    return btoa(`${url.hostname}${url.pathname}`).replace(/[+/=]/g, '');
  } catch {
    return btoa(serverUrl).replace(/[+/=]/g, '');
  }
}

export class ChromeExtensionOAuthProvider implements OAuthClientProvider {
  private connectionId: string;
  private serverName: string;
  private serverUrl: string;
  private onOAuthSuccess?: () => void;

  constructor(
    connectionId: string,
    serverName: string,
    serverUrl: string,
    onOAuthSuccess?: () => void,
  ) {
    this.connectionId = connectionId;
    this.serverName = serverName;
    this.serverUrl = serverUrl;
    this.onOAuthSuccess = onOAuthSuccess;
  }

  get redirectUrl(): string {
    return `${OAUTH_CALLBACK_ORIGIN}${OAUTH_CALLBACK_PATH}`;
  }

  get clientMetadata(): OAuthClientMetadata {
    return {
      redirect_uris: [this.redirectUrl],
      grant_types: ['authorization_code'],
      response_types: ['code'],
      client_name: `Waypoint - ${this.serverName}`,
      token_endpoint_auth_method: 'none',
    };
  }

  clientInformation(): OAuthClientInformation | undefined {
    // Returns synchronously — use the cached value from storageGet if needed
    // For the SDK's interface this must be sync; we pre-load it in loadClientInfo()
    return this._cachedClientInfo;
  }

  private _cachedClientInfo?: OAuthClientInformation;

  async loadClientInfo(): Promise<void> {
    const raw = await storageGet(`mcp_client_${serverKey(this.serverUrl)}`);
    if (raw) {
      this._cachedClientInfo = JSON.parse(raw);
    }
  }

  async saveClientInformation(info: OAuthClientInformation): Promise<void> {
    this._cachedClientInfo = info;
    await storageSet(`mcp_client_${serverKey(this.serverUrl)}`, JSON.stringify(info));
  }

  tokens(): OAuthTokens | undefined {
    return this._cachedTokens;
  }

  private _cachedTokens?: OAuthTokens;

  async loadTokens(): Promise<void> {
    const raw = await storageGet(`mcp_tokens_${this.connectionId}`);
    if (raw) {
      this._cachedTokens = JSON.parse(raw);
    }
  }

  async saveTokens(tokens: OAuthTokens): Promise<void> {
    this._cachedTokens = tokens;
    await storageSet(`mcp_tokens_${this.connectionId}`, JSON.stringify(tokens));
  }

  async saveCodeVerifier(codeVerifier: string): Promise<void> {
    await storageSet(`mcp_verifier_${this.connectionId}`, codeVerifier);
  }

  async codeVerifier(): Promise<string> {
    const v = await storageGet(`mcp_verifier_${this.connectionId}`);
    if (!v) throw new Error('No code verifier stored for OAuth flow');
    return v;
  }

  async clearTokens(): Promise<void> {
    this._cachedTokens = undefined;
    await storageRemove(`mcp_tokens_${this.connectionId}`);
    await storageRemove(`mcp_verifier_${this.connectionId}`);
  }

  /**
   * Called by the MCP SDK when the server returns 401.
   * Opens a new Chrome tab pointing at the authorization URL.
   * Listens for a redirect back to the callback URL via chrome.tabs.onUpdated.
   */
  async redirectToAuthorization(authorizationUrl: URL): Promise<void> {
    return new Promise((resolve, reject) => {
      // Open consent tab
      chrome.tabs.create({ url: authorizationUrl.toString() }, tab => {
        if (chrome.runtime.lastError || !tab?.id) {
          reject(new Error(`Could not open OAuth tab: ${chrome.runtime.lastError?.message}`));
          return;
        }

        const consentTabId = tab.id;

        const listener = (
          tabId: number,
          changeInfo: chrome.tabs.TabChangeInfo,
          updatedTab: chrome.tabs.Tab,
        ) => {
          if (tabId !== consentTabId) return;
          if (changeInfo.status !== 'loading') return;

          const url = updatedTab.url ?? changeInfo.url;
          if (!url) return;

          try {
            const parsed = new URL(url);
            const isCallback =
              parsed.origin === OAUTH_CALLBACK_ORIGIN &&
              parsed.pathname === OAUTH_CALLBACK_PATH;

            if (!isCallback) return;

            // Unregister listener and close the consent tab
            chrome.tabs.onUpdated.removeListener(listener);
            chrome.tabs.remove(consentTabId).catch(() => {});

            const code = parsed.searchParams.get('code');
            const error = parsed.searchParams.get('error');

            if (error) {
              reject(new Error(`OAuth authorization error: ${error}`));
              return;
            }

            if (!code) {
              reject(new Error('OAuth callback missing authorization code'));
              return;
            }

            // Exchange code for tokens using the SDK's auth helper
            auth(this, { serverUrl: this.serverUrl, authorizationCode: code })
              .then(result => {
                if (result === 'AUTHORIZED') {
                  this.onOAuthSuccess?.();
                  resolve();
                } else {
                  reject(new Error('Token exchange returned non-AUTHORIZED result'));
                }
              })
              .catch(reject);
          } catch {
            // URL parse failed — not our callback
          }
        };

        chrome.tabs.onUpdated.addListener(listener);
      });
    });
  }
}
