import { X, Play, Trash2, Download, ArrowRight } from 'lucide-react';
import { useApp, msgId } from '../../context/AppContext';
import { sendToBackground } from '../../cross-tab';
import { sleep, waitForTabLoad } from '../../executor';

export function WorkflowsPanel() {
  const { state, dispatch } = useApp();
  if (state.activePanel !== 'wf') return null;

  const replay = async (wfIdx: number) => {
    const wf = state.workflows[wfIdx];
    if (!wf) return;
    dispatch({ type: 'SET_STATUS', status: 'busy' });
    dispatch({ type: 'ADD_MESSAGE', message: { id: msgId(), role: 'system', content: `Replaying workflow: ${wf.name}` } });
    dispatch({ type: 'SET_ACTIVE_PANEL', panel: null });

    for (const action of wf.actions) {
      await sendToBackground({ action: action.type, selector: action.selector, value: action.value, url: action.url });
      if (action.type === 'navigate') await waitForTabLoad();
      await sleep(350);
    }

    dispatch({ type: 'ADD_MESSAGE', message: { id: msgId(), role: 'system', content: 'Workflow replay complete.' } });
    dispatch({ type: 'SET_STATUS', status: 'done' });
  };

  const remove = async (id: number) => {
    dispatch({ type: 'REMOVE_WORKFLOW', id });
    const updated = state.workflows.filter(w => w.id !== id);
    await chrome.storage.local.set({ wp_workflows: updated });
  };

  const downloadTemplate = () => {
    const fills = state.workflows.flatMap(wf => wf.actions.filter(a => a.type === 'fill'));
    if (!fills.length) return;
    const cols = [...new Set(fills.map(f => f.selector || f.placeholder || 'field'))];
    const blob = new Blob([cols.join(',') + '\n'], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'waypoint-template.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="absolute inset-0 top-12 bg-surface-card flex flex-col z-50 overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 font-semibold text-sm">
        <span>Workflows</span>
        <button onClick={() => dispatch({ type: 'SET_ACTIVE_PANEL', panel: null })} className="text-slate-400 hover:text-slate-200"><X size={18} /></button>
      </div>
      <div className="p-4 flex-1 overflow-y-auto">
        {state.recordedActions.length > 0 && !state.isRecording && (
          <div className="bg-emerald-500/8 border border-emerald-500/25 rounded-lg p-3 mb-3">
            <p className="text-xs text-emerald-400 font-semibold mb-2">{state.recordedActions.length} actions recorded</p>
            <div className="flex gap-2">
              <input id="wf-save-name" placeholder="Workflow name..." className="flex-1 px-2 py-1 bg-surface-base border border-slate-700/50 rounded text-xs text-slate-100 outline-none focus:border-emerald-500/50 placeholder:text-slate-500" />
              <button
                onClick={async () => {
                  const input = document.getElementById('wf-save-name') as HTMLInputElement;
                  const n = input?.value?.trim();
                  if (!n) return;
                  const wf = { id: Date.now(), name: n, actions: [...state.recordedActions], savedAt: new Date().toISOString(), source: 'recording' as const };
                  dispatch({ type: 'ADD_WORKFLOW', workflow: wf });
                  const updated = [...state.workflows, wf];
                  await chrome.storage.local.set({ wp_workflows: updated });
                  dispatch({ type: 'SET_RECORDED_ACTIONS', actions: [] });
                  input.value = '';
                }}
                className="px-3 py-1 rounded bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {state.workflows.map((wf, i) => (
            <div key={wf.id} className="flex items-center justify-between px-3 py-2 bg-surface-elevated border border-slate-700/50 rounded-lg text-xs">
              <div>
                <span className="font-medium">{wf.name}</span>
                <span className="text-slate-500 ml-2">{wf.actions.length} actions</span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => replay(i)} className="p-1 text-slate-400 hover:text-emerald-400"><Play size={14} /></button>
                <button onClick={() => remove(wf.id)} className="p-1 text-slate-400 hover:text-red-400"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
          {state.workflows.length === 0 && <p className="text-xs text-slate-500 text-center py-4">No saved workflows yet.</p>}
        </div>

        <div className="flex gap-2 mt-4">
          <button onClick={downloadTemplate} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-surface-elevated border border-slate-700/50 text-xs text-slate-300 font-medium hover:bg-surface-hover transition-colors">
            <Download size={14} /> CSV Template
          </button>
          <button onClick={() => dispatch({ type: 'SET_ACTIVE_PANEL', panel: 'ds' })} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-surface-elevated border border-slate-700/50 text-xs text-slate-300 font-medium hover:bg-surface-hover transition-colors">
            Data Source <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
