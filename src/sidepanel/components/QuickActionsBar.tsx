import { Rocket, Bot, Target } from 'lucide-react';
import { useApp, msgId } from '../context/AppContext';
import { launchDemo, launchDemoAI } from '../demo';
import { DEFAULT_SCENARIO } from '../scenario';

export function QuickActionsBar() {
  const { state, dispatch, pendingResumeRef } = useApp();

  // Only show when there are messages (WelcomeCard handles the empty state)
  if (state.messages.length === 0 || state.activePanel !== null) return null;

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 border-t border-slate-700/30 bg-surface-base overflow-x-auto shrink-0 scrollbar-hide">
      <button
        onClick={() => launchDemo(dispatch)}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap
          bg-emerald-500/8 border border-emerald-500/20 text-emerald-500
          hover:bg-emerald-500/15 hover:border-emerald-500/35 transition-colors shrink-0"
      >
        <Rocket size={10} /> Demo
      </button>
      <button
        onClick={() => launchDemoAI(dispatch)}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap
          bg-emerald-500/8 border border-emerald-500/20 text-emerald-500
          hover:bg-emerald-500/15 hover:border-emerald-500/35 transition-colors shrink-0"
      >
        <Bot size={10} /> AI Demo
      </button>
      <button
        onClick={() => {
          dispatch({ type: 'SET_PENDING_SCENARIO', pending: true });
          dispatch({ type: 'ADD_MESSAGE', message: { id: msgId(), role: 'system', content: 'Scenario loaded. Edit if needed, then press Send.' } });
          window.dispatchEvent(new CustomEvent('waypoint-set-input', { detail: DEFAULT_SCENARIO }));
        }}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap
          bg-emerald-500/8 border border-emerald-500/20 text-emerald-500
          hover:bg-emerald-500/15 hover:border-emerald-500/35 transition-colors shrink-0"
      >
        <Target size={10} /> Scenario
      </button>

      <div className="w-px h-3 bg-slate-700/50 mx-0.5 shrink-0" />

      {['What is this page?', 'Click first button', 'Fill the form'].map(prompt => (
        <button
          key={prompt}
          onClick={() => {
            dispatch({ type: 'ADD_MESSAGE', message: { id: msgId(), role: 'user', content: prompt } });
            import('../chat-handler').then(({ handleSend }) => handleSend(prompt, state, dispatch, pendingResumeRef));
          }}
          className="px-2.5 py-1 rounded-full text-[10px] whitespace-nowrap shrink-0
            bg-surface-elevated border border-slate-700/50
            text-slate-400 hover:text-emerald-400 hover:border-emerald-500/35 transition-colors"
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}
