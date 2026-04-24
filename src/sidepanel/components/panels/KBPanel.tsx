import { useState } from 'react';
import { X, ChevronDown, ChevronRight, Trash2, Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export function KBPanel() {
  const { state, dispatch } = useApp();
  const [expanded, setExpanded] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [content, setContent] = useState('');

  if (state.activePanel !== 'kb') return null;

  const addDoc = async () => {
    if (!name.trim() || !content.trim()) return;
    const doc = { id: Date.now(), name: name.trim(), content: content.trim() };
    dispatch({ type: 'ADD_KB_DOCUMENT', doc });
    await chrome.storage.local.set({ wp_kb: [...state.kbDocuments, doc] });
    setName('');
    setContent('');
  };

  const removeDoc = async (id: number) => {
    dispatch({ type: 'REMOVE_KB_DOCUMENT', id });
    const updated = state.kbDocuments.filter(d => d.id !== id);
    await chrome.storage.local.set({ wp_kb: updated });
  };

  return (
    <div className="absolute inset-0 top-12 bg-surface-card flex flex-col z-50 overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 font-semibold text-sm">
        <span>Knowledge Base</span>
        <button onClick={() => dispatch({ type: 'SET_ACTIVE_PANEL', panel: null })} className="text-slate-400 hover:text-slate-200"><X size={18} /></button>
      </div>
      <div className="p-4 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-2 mb-4">
          {state.kbDocuments.map(doc => (
            <div key={doc.id} className="bg-surface-elevated border border-slate-700/50 rounded-lg overflow-hidden">
              <div
                className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-emerald-500/5 text-xs font-medium"
                onClick={() => setExpanded(expanded === doc.id ? null : doc.id)}
              >
                <div className="flex items-center gap-1.5">
                  {expanded === doc.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <span>{doc.name}</span>
                </div>
                <button onClick={e => { e.stopPropagation(); removeDoc(doc.id); }} className="text-slate-500 hover:text-red-400"><Trash2 size={14} /></button>
              </div>
              {expanded === doc.id && (
                <div className="px-3 py-2 border-t border-slate-700/50 text-[11px] text-slate-400 whitespace-pre-wrap">{doc.content}</div>
              )}
            </div>
          ))}
          {state.kbDocuments.length === 0 && <p className="text-xs text-slate-500 text-center py-4">No KB entries yet. Add systems below.</p>}
        </div>
        <div className="flex flex-col gap-2 pt-3 border-t border-slate-700/50">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="System name (e.g. CRM Portal)"
            className="w-full px-3 py-2 bg-surface-base border border-slate-700/50 rounded-lg text-slate-100 text-xs outline-none focus:border-emerald-500/50 placeholder:text-slate-500" />
          <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="URL, purpose, key fields..."
            rows={3} className="w-full px-3 py-2 bg-surface-base border border-slate-700/50 rounded-lg text-slate-100 text-xs outline-none focus:border-emerald-500/50 resize-y placeholder:text-slate-500" />
          <button onClick={addDoc} className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors">
            <Plus size={14} /> Add to KB
          </button>
        </div>
      </div>
    </div>
  );
}
