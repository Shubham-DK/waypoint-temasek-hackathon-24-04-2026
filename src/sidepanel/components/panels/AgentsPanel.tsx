import { useState, useEffect } from 'react';
import { X, ArrowLeft, Trash2, Plus, Pencil, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { fetchModels } from '../../claude';
import { config } from '../../../config';
import type { AgentDef } from '../../../types/actions';
import { ModelSelect } from '../ModelSelect';

type View = 'list' | 'edit' | 'add';

interface FormState {
  name: string;
  role: string;
  systemPrompt: string;
  maxTokens: string;
  model: string;
}

const EMPTY_FORM: FormState = { name: '', role: '', systemPrompt: '', maxTokens: '400', model: '' };

export function AgentsPanel() {
  const { state, dispatch } = useApp();
  const [view, setView] = useState<View>('list');
  const [editingAgent, setEditingAgent] = useState<AgentDef | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [models, setModels] = useState<{ id: string; display_name: string }[]>([]);

  useEffect(() => {
    if (state.activePanel === 'agents' && config.CLAUDE_API_KEY.startsWith('sk-ant-')) {
      fetchModels(config.CLAUDE_API_KEY).then(list => setModels(list));
    }
    // Reset to list view when panel is toggled
    setView('list');
    setEditingAgent(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.activePanel]);

  if (state.activePanel !== 'agents') return null;

  const saveToStorage = (agents: AgentDef[]) => chrome.storage.local.set({ wp_agents: agents });

  const openEdit = (agent: AgentDef) => {
    setEditingAgent(agent);
    setForm({
      name: agent.name,
      role: agent.role,
      systemPrompt: agent.systemPrompt,
      maxTokens: String(agent.maxTokens),
      model: agent.model || '',
    });
    setView('edit');
  };

  const openAdd = () => {
    setForm({ ...EMPTY_FORM, model: config.CLAUDE_MODEL || '' });
    setView('add');
  };

  const saveEdit = () => {
    if (!editingAgent) return;
    const changes: Partial<AgentDef> = {
      name: form.name.trim(),
      role: form.role.trim(),
      systemPrompt: form.systemPrompt.trim(),
      maxTokens: parseInt(form.maxTokens) || 400,
      model: form.model || undefined,
    };
    dispatch({ type: 'UPDATE_AGENT', id: editingAgent.id, changes });
    saveToStorage(state.agentDefs.map(a => a.id === editingAgent.id ? { ...a, ...changes } : a));
    setView('list');
  };

  const saveAdd = () => {
    if (!form.name.trim() || !form.role.trim() || !form.systemPrompt.trim()) return;
    const agent: AgentDef = {
      id: Date.now(),
      name: form.name.trim(),
      role: form.role.trim(),
      systemPrompt: form.systemPrompt.trim(),
      maxTokens: parseInt(form.maxTokens) || 400,
      model: form.model || undefined,
    };
    dispatch({ type: 'ADD_AGENT', agent });
    saveToStorage([...state.agentDefs, agent]);
    setView('list');
  };

  const removeAgent = (id: number) => {
    dispatch({ type: 'REMOVE_AGENT', id });
    saveToStorage(state.agentDefs.filter(a => a.id !== id));
  };

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(s => ({ ...s, [key]: e.target.value }));

  const inputCls = 'w-full px-3 py-2 bg-surface-base border border-slate-700/50 rounded-lg text-slate-100 text-sm outline-none focus:border-emerald-500/50 placeholder:text-slate-500 transition-colors';
  const labelCls = 'text-[10px] uppercase tracking-wider text-slate-500 mb-1 block font-medium';
  const defaultModelLabel = `Use global default (${config.CLAUDE_MODEL})`;

  /* ─────────────────────────────────────────────
     EDIT / ADD PAGE
  ───────────────────────────────────────────── */
  if (view === 'edit' || view === 'add') {
    const isEdit = view === 'edit';
    const canSave = form.name.trim() && form.role.trim() && form.systemPrompt.trim();

    return (
      <div className="absolute inset-0 top-12 bg-surface-card flex flex-col z-50">
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-3 border-b border-slate-700/50 shrink-0">
          <button
            onClick={() => setView('list')}
            className="flex items-center justify-center w-7 h-7 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <span className="font-semibold text-sm flex-1">
            {isEdit ? `Edit — ${editingAgent?.name}` : 'New Agent'}
          </span>
          <button onClick={() => dispatch({ type: 'SET_ACTIVE_PANEL', panel: null })} className="text-slate-400 hover:text-slate-200">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Name</label>
              <input value={form.name} onChange={set('name')} placeholder="e.g. Validator" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Role ID</label>
              <input value={form.role} onChange={set('role')} placeholder="e.g. validator" className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>
              System Prompt
              <span className="ml-1.5 normal-case text-emerald-500/70 font-normal">→ sent to Claude as the agent's instructions</span>
            </label>
            <textarea
              value={form.systemPrompt}
              onChange={set('systemPrompt')}
              placeholder="You are a... Your job is to..."
              rows={10}
              className={`${inputCls} resize-y font-mono text-xs leading-relaxed`}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Max Tokens</label>
              <input
                type="number"
                value={form.maxTokens}
                onChange={set('maxTokens')}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Model</label>
              <ModelSelect
                value={form.model}
                onChange={v => setForm(s => ({ ...s, model: v }))}
                models={models}
                defaultLabel={defaultModelLabel}
                size="md"
              />
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex gap-2 px-4 py-3 border-t border-slate-700/50 shrink-0">
          <button
            onClick={isEdit ? saveEdit : saveAdd}
            disabled={!canSave}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Check size={14} /> {isEdit ? 'Save Changes' : 'Create Agent'}
          </button>
          <button
            onClick={() => setView('list')}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-surface-base border border-slate-700/50 text-slate-300 text-sm font-semibold hover:bg-surface-hover transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  /* ─────────────────────────────────────────────
     LIST PAGE
  ───────────────────────────────────────────── */
  return (
    <div className="absolute inset-0 top-12 bg-surface-card flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 font-semibold text-sm shrink-0">
        <span>Agents <span className="text-slate-500 font-normal text-xs ml-1">({state.agentDefs.length})</span></span>
        <button onClick={() => dispatch({ type: 'SET_ACTIVE_PANEL', panel: null })} className="text-slate-400 hover:text-slate-200">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {state.agentDefs.map(agent => {
          const isExpanded = expanded === agent.id;
          return (
            <div key={agent.id} className="bg-surface-elevated border border-slate-700/50 rounded-lg overflow-hidden">
              {/* Row */}
              <div
                className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-slate-700/20 select-none"
                onClick={() => setExpanded(isExpanded ? null : agent.id)}
              >
                <span className="text-slate-500 shrink-0">
                  {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium text-slate-200 truncate">{agent.name}</span>
                  <span className="text-[10px] text-slate-500 ml-1.5">{agent.role}</span>
                  {agent.model && (
                    <span className="ml-1.5 text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded-full font-medium">
                      {agent.model.split('-').slice(0, 3).join('-')}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={e => { e.stopPropagation(); openEdit(agent); }}
                    title="Edit"
                    className="p-1.5 rounded text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); removeAgent(agent.id); }}
                    title="Delete"
                    className="p-1.5 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              {/* Expanded read-only */}
              {isExpanded && (
                <div className="px-3 pb-3 pt-2 border-t border-slate-700/40 text-[11px] text-slate-400 space-y-1.5">
                  <p className="whitespace-pre-wrap leading-relaxed font-mono text-[10px] max-h-28 overflow-y-auto">
                    {agent.systemPrompt}
                  </p>
                  <div className="flex gap-3 text-[10px] text-slate-500 pt-0.5">
                    <span>Max tokens: {agent.maxTokens}</span>
                    {agent.model && <span>Model: {agent.model}</span>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add button pinned at bottom */}
      <div className="px-3 py-3 border-t border-slate-700/50 shrink-0">
        <button
          onClick={openAdd}
          className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors"
        >
          <Plus size={14} /> Add Agent
        </button>
      </div>
    </div>
  );
}
