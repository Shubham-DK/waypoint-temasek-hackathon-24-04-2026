import { useState, useEffect, useCallback } from 'react';
import { X, RefreshCw } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { config } from '../../../config';
import { fetchModels } from '../../claude';
import { ModelSelect } from '../ModelSelect';

export function SettingsPanel() {
  const { state, dispatch } = useApp();
  const [apiKey, setApiKey] = useState(config.CLAUDE_API_KEY);
  const [model, setModel] = useState(config.CLAUDE_MODEL);
  const [piiMask, setPiiMask] = useState(state.piiMaskEnabled);
  const [models, setModels] = useState<{ id: string; display_name: string }[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  useEffect(() => {
    setApiKey(config.CLAUDE_API_KEY);
    setModel(config.CLAUDE_MODEL);
    setPiiMask(state.piiMaskEnabled);
  }, [state.piiMaskEnabled]);

  const loadModels = useCallback(async (key: string) => {
    if (!key.startsWith('sk-ant-')) return;
    setLoadingModels(true);
    const list = await fetchModels(key);
    setModels(list);
    setLoadingModels(false);
  }, []);

  // Auto-load when panel opens and key is set
  useEffect(() => {
    if (state.activePanel === 'settings') {
      loadModels(apiKey);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.activePanel]);

  if (state.activePanel !== 'settings') return null;

  const save = async () => {
    config.CLAUDE_API_KEY = apiKey;
    config.CLAUDE_MODEL = model || 'claude-sonnet-4-6';
    dispatch({ type: 'SET_SETTINGS', piiMaskEnabled: piiMask });
    await chrome.storage.local.set({
      wp_settings: { claudeKey: apiKey, claudeModel: model, piiMask },
    });
    dispatch({ type: 'SET_ACTIVE_PANEL', panel: null });
  };

  const inputCls = 'w-full px-3 py-2 bg-surface-base border border-slate-700/50 rounded-lg text-slate-100 text-sm outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 placeholder:text-slate-500 transition-colors';

  return (
    <div className="absolute inset-0 top-12 bg-surface-card flex flex-col z-50 overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 font-semibold text-sm shrink-0">
        <span>Settings</span>
        <button onClick={() => dispatch({ type: 'SET_ACTIVE_PANEL', panel: null })} className="text-slate-400 hover:text-slate-200">
          <X size={18} />
        </button>
      </div>
      <div className="p-4 flex flex-col gap-4">
        {/* API Key */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-slate-400 uppercase tracking-wide font-medium">Claude API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            onBlur={e => loadModels(e.target.value)}
            placeholder="sk-ant-..."
            className={inputCls}
          />
        </div>

        {/* Model dropdown */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label className="text-[11px] text-slate-400 uppercase tracking-wide font-medium">Claude Model</label>
            <button
              onClick={() => loadModels(apiKey)}
              disabled={loadingModels || !apiKey.startsWith('sk-ant-')}
              title="Refresh model list"
              className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-emerald-400 disabled:opacity-40 transition-colors"
            >
              <RefreshCw size={11} className={loadingModels ? 'animate-spin' : ''} />
              {loadingModels ? 'Loading…' : 'Refresh'}
            </button>
          </div>
          {models.length > 0 ? (
            <ModelSelect
              value={model}
              onChange={setModel}
              models={models}
              size="md"
            />
          ) : (
            <input
              type="text"
              value={model}
              onChange={e => setModel(e.target.value)}
              placeholder={apiKey.startsWith('sk-ant-') ? 'Loading models…' : 'claude-sonnet-4-6'}
              className={inputCls}
            />
          )}
          {!apiKey.startsWith('sk-ant-') && (
            <p className="text-[10px] text-slate-500">Enter a valid API key to load available models.</p>
          )}
        </div>

        {/* PII masking */}
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={piiMask} onChange={e => setPiiMask(e.target.checked)} className="accent-emerald-500 w-4 h-4" />
          Enable PII masking
        </label>

        <button
          onClick={save}
          className="w-full py-2 rounded-lg bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition-colors"
        >
          Save Settings
        </button>
      </div>
    </div>
  );
}
