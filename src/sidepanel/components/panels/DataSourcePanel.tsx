import { useRef } from 'react';
import { X, RefreshCw, Play, Upload } from 'lucide-react';
import { useApp, msgId } from '../../context/AppContext';
import { parseCSV } from '../../csv';
import { claudeCall } from '../../claude';
import { sendToBackground } from '../../cross-tab';
import { sleep } from '../../executor';

export function DataSourcePanel() {
  const { state, dispatch } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  if (state.activePanel !== 'ds') return null;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = parseCSV(ev.target?.result as string);
      dispatch({ type: 'SET_CSV_DATA', data });
    };
    reader.readAsText(file);
  };

  const autoMap = async () => {
    if (!state.csvData.length) return;
    const columns = Object.keys(state.csvData[0]);
    const inputs = await new Promise<string[]>(resolve => {
      chrome.runtime.sendMessage({ type: 'EXECUTE_ACTION', action: 'getPageContent' }, (r: { inputs?: string[] }) => resolve(r?.inputs || []));
    });
    if (!inputs.length) return;

    try {
      const result = await claudeCall({
        messages: [{ role: 'user', content: `Map CSV columns to selectors. Columns: ${JSON.stringify(columns)}. Inputs: ${JSON.stringify(inputs)}. Return only JSON: {"mappings":{"column":"selector"}}` }],
        system: 'Return only valid JSON.',
        maxTokens: 400,
      });
      const parsed = JSON.parse(result.match(/\{[\s\S]*\}/)?.[0] || '{}');
      dispatch({ type: 'SET_CSV_MAPPINGS', mappings: parsed.mappings || {} });
    } catch {
      dispatch({ type: 'ADD_MESSAGE', message: { id: msgId(), role: 'system', content: 'Auto-map failed.' } });
    }
  };

  const runFill = async () => {
    if (!state.csvData.length || !Object.keys(state.csvMappings).length) return;
    dispatch({ type: 'SET_STATUS', status: 'busy' });
    dispatch({ type: 'SET_ACTIVE_PANEL', panel: null });

    for (let i = 0; i < state.csvData.length; i++) {
      dispatch({ type: 'ADD_MESSAGE', message: { id: msgId(), role: 'system', content: `Filling row ${i + 1} of ${state.csvData.length}...` } });
      for (const [col, selector] of Object.entries(state.csvMappings)) {
        if (!selector || !state.csvData[i][col]) continue;
        await sendToBackground({ action: 'fill', selector, value: state.csvData[i][col] });
        await sleep(200);
      }
      await sleep(500);
    }

    dispatch({ type: 'ADD_MESSAGE', message: { id: msgId(), role: 'system', content: `Auto-fill complete. ${state.csvData.length} rows.` } });
    dispatch({ type: 'SET_STATUS', status: 'done' });
  };

  const columns = state.csvData.length ? Object.keys(state.csvData[0]) : [];

  return (
    <div className="absolute inset-0 top-12 bg-surface-card flex flex-col z-50 overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 font-semibold text-sm">
        <span>Data Source</span>
        <button onClick={() => dispatch({ type: 'SET_ACTIVE_PANEL', panel: null })} className="text-slate-400 hover:text-slate-200"><X size={18} /></button>
      </div>
      <div className="p-4 flex-1 overflow-y-auto">
        <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center text-slate-400 mb-4 hover:border-emerald-500/50 transition-colors cursor-pointer"
          onClick={() => fileRef.current?.click()}>
          <Upload size={20} className="mx-auto mb-2" />
          <p className="text-xs">Upload a CSV file to auto-fill forms</p>
          <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
        </div>

        {state.csvData.length > 0 && (
          <>
            <div className="bg-surface-base border border-slate-700/50 rounded-lg p-2 max-h-[180px] overflow-auto mb-4 text-[11px]">
              <table className="w-full border-collapse">
                <thead>
                  <tr>{columns.map(c => <th key={c} className="bg-surface-card text-left p-1.5 border border-slate-700/50 font-semibold text-slate-300">{c}</th>)}</tr>
                </thead>
                <tbody>
                  {state.csvData.slice(0, 5).map((row, i) => (
                    <tr key={i}>{columns.map(c => <td key={c} className="p-1.5 border border-slate-700/50 text-slate-400">{row[c]}</td>)}</tr>
                  ))}
                </tbody>
              </table>
              {state.csvData.length > 5 && <p className="text-slate-500 mt-1">...and {state.csvData.length - 5} more rows</p>}
            </div>

            {Object.keys(state.csvMappings).length > 0 && (
              <div className="mb-4">
                <table className="w-full border-collapse text-xs">
                  <thead><tr><th className="bg-surface-card p-2 border border-slate-700/50 text-left text-slate-300">Column</th><th className="bg-surface-card p-2 border border-slate-700/50 text-left text-slate-300">Selector</th></tr></thead>
                  <tbody>
                    {columns.map(col => (
                      <tr key={col}>
                        <td className="p-2 border border-slate-700/50">{col}</td>
                        <td className="p-2 border border-slate-700/50">
                          <input value={state.csvMappings[col] || ''} onChange={e => dispatch({ type: 'SET_CSV_MAPPINGS', mappings: { ...state.csvMappings, [col]: e.target.value } })}
                            className="w-full px-2 py-1 bg-surface-base border border-slate-700/50 rounded text-slate-100 outline-none focus:border-emerald-500/50 placeholder:text-slate-500" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={autoMap} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-surface-elevated border border-slate-700/50 text-xs text-slate-300 font-medium hover:bg-surface-hover transition-colors">
                <RefreshCw size={14} /> Auto-Map
              </button>
              <button onClick={runFill} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors">
                <Play size={14} /> Run Auto-Fill
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
