import {
  Globe, MousePointer, PenLine, HelpCircle, CheckCircle, Clock,
  ArrowLeftRight, BookOpen, FolderOpen, Check, X, Save, LayoutList,
} from 'lucide-react';
import { useApp, msgId } from '../context/AppContext';
import { executePlan } from '../executor';

interface StepMeta {
  icon: React.ReactNode;
  color: string;       // icon container bg
  iconColor: string;   // icon colour
}

const STEP_META: Record<string, StepMeta> = {
  navigate:   { icon: <Globe size={13} />,          color: 'bg-blue-500/15',    iconColor: 'text-blue-400' },
  open_tab:   { icon: <FolderOpen size={13} />,     color: 'bg-blue-500/15',    iconColor: 'text-blue-400' },
  switch_tab: { icon: <ArrowLeftRight size={13} />, color: 'bg-cyan-500/15',    iconColor: 'text-cyan-400' },
  read_tab:   { icon: <BookOpen size={13} />,       color: 'bg-slate-500/20',   iconColor: 'text-slate-400' },
  fill:       { icon: <PenLine size={13} />,        color: 'bg-amber-500/15',   iconColor: 'text-amber-400' },
  click:      { icon: <MousePointer size={13} />,   color: 'bg-yellow-500/15',  iconColor: 'text-yellow-400' },
  ask_user:   { icon: <HelpCircle size={13} />,     color: 'bg-purple-500/15',  iconColor: 'text-purple-400' },
  confirm:    { icon: <CheckCircle size={13} />,    color: 'bg-emerald-500/15', iconColor: 'text-emerald-400' },
  wait:       { icon: <Clock size={13} />,          color: 'bg-slate-500/15',   iconColor: 'text-slate-500' },
};

export function ApprovalCard() {
  const { state, dispatch, pendingResumeRef } = useApp();
  if (!state.pendingPlan) return null;

  const plan = state.pendingPlan;

  const handleApprove = () => {
    dispatch({ type: 'CLEAR_PENDING_PLAN' });
    executePlan(plan, dispatch, pendingResumeRef);
  };

  const handleReject = () => {
    dispatch({ type: 'CLEAR_PENDING_PLAN' });
    dispatch({ type: 'ADD_MESSAGE', message: { id: msgId(), role: 'assistant', content: 'Plan rejected. How else can I help?' } });
  };

  const handleSave = () => {
    const name = prompt('Name this workflow:');
    if (!name) return;
    const workflow = {
      id: Date.now(),
      name,
      actions: plan.steps.map(s => ({
        type: s.action as 'click' | 'fill' | 'navigate',
        selector: s.selector,
        url: s.url,
        value: s.value,
        timestamp: Date.now(),
      })),
      savedAt: new Date().toISOString(),
      source: 'ai-plan' as const,
    };
    dispatch({ type: 'ADD_WORKFLOW', workflow });
    chrome.storage.local.get('wp_workflows', (data) => {
      const wfs = data.wp_workflows || [];
      wfs.push(workflow);
      chrome.storage.local.set({ wp_workflows: wfs });
    });
    dispatch({ type: 'ADD_MESSAGE', message: { id: msgId(), role: 'assistant', content: `Workflow "${name}" saved.` } });
  };

  return (
    <div className="mx-3 mb-2 bg-surface-elevated border border-slate-700/60 rounded-xl overflow-hidden shadow-xl shrink-0">

      {/* ── Header ── */}
      <div className="flex items-start gap-3 px-4 pt-3.5 pb-2.5 border-b border-slate-700/50">
        <div className="flex items-center justify-center w-7 h-7 rounded-md bg-red-500/20 shrink-0 mt-0.5">
          <LayoutList size={14} className="text-red-400" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-red-400 mb-0.5">Proposed Plan</p>
          <p className="text-xs text-slate-300 leading-snug">{plan.summary}</p>
        </div>
      </div>

      {/* ── Steps ── */}
      <div className="max-h-[220px] overflow-y-auto divide-y divide-slate-700/30">
        {plan.steps.map((step, i) => {
          const meta = STEP_META[step.action] ?? { icon: <Check size={13} />, color: 'bg-slate-500/15', iconColor: 'text-slate-400' };
          // Show a hint value for fill/navigate/ask_user on the right
          const hint = step.action === 'fill' ? step.value
            : step.action === 'navigate' || step.action === 'open_tab' ? step.url
            : step.action === 'ask_user' ? step.question
            : null;

          return (
            <div key={i} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-700/20 transition-colors">
              {/* Step number */}
              <span className="text-[10px] text-slate-600 tabular-nums w-4 shrink-0 text-right">{i + 1}</span>
              {/* Icon */}
              <span className={`flex items-center justify-center w-6 h-6 rounded-md shrink-0 ${meta.color} ${meta.iconColor}`}>
                {meta.icon}
              </span>
              {/* Description */}
              <span className="flex-1 text-xs text-slate-200 min-w-0 leading-snug truncate">{step.description}</span>
              {/* Hint value */}
              {hint && (
                <span className="text-[10px] text-slate-500 italic shrink-0 max-w-[80px] truncate ml-1" title={hint}>
                  "{hint}"
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Footer ── */}
      <div className="flex gap-2 px-4 py-3 border-t border-slate-700/50">
        <button
          onClick={handleApprove}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 transition-colors shadow-sm"
        >
          <Check size={13} /> Approve &amp; Run
        </button>
        <button
          onClick={handleSave}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600/80 border border-indigo-500/50 text-white text-xs font-semibold hover:bg-indigo-600 transition-colors"
        >
          <Save size={13} /> Save Plan
        </button>
        <button
          onClick={handleReject}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-surface-base border border-slate-700/50 text-slate-400 text-xs font-semibold hover:text-red-400 hover:border-red-500/30 transition-colors"
        >
          <X size={13} /> Cancel
        </button>
      </div>
    </div>
  );
}
