import { Compass, Rocket, Bot, Target } from 'lucide-react';
import { useApp, msgId } from '../context/AppContext';
import { launchDemo, launchDemoAI } from '../demo';
import { DEFAULT_SCENARIO } from '../scenario';

export function WelcomeCard() {
  const { state, dispatch, pendingResumeRef } = useApp();

  const handleExample = (prompt: string) => {
    dispatch({ type: 'ADD_MESSAGE', message: { id: msgId(), role: 'user', content: prompt } });
    import('../chat-handler').then(({ handleSend }) => {
      handleSend(prompt, state, dispatch, pendingResumeRef);
    });
  };

  return (
    <div className="bg-surface-card border border-slate-700/50 rounded-xl p-6 mx-auto max-w-[320px] text-center shadow-md my-auto">
      <h2 className="text-[17px] font-bold text-slate-100 flex items-center justify-center gap-2 mb-2">
        <Compass size={20} className="text-emerald-400" />
        Waypoint
      </h2>
      <p className="text-slate-400 text-xs mb-4 leading-relaxed">
        AI browser agent — navigate, understand, and get things done across any web app.
      </p>

      <div className="flex flex-wrap gap-1.5 justify-center mb-3">
        <button
          onClick={() => launchDemo(dispatch)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium
            bg-emerald-500/10 border border-emerald-500/25 text-emerald-400
            hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-colors"
        >
          <Rocket size={12} /> Launch Demo
        </button>
        <button
          onClick={() => launchDemoAI(dispatch)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium
            bg-emerald-500/10 border border-emerald-500/25 text-emerald-400
            hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-colors"
        >
          <Bot size={12} /> AI Demo
        </button>
        <button
          onClick={() => {
            dispatch({ type: 'SET_PENDING_SCENARIO', pending: true });
            dispatch({ type: 'ADD_MESSAGE', message: { id: msgId(), role: 'system', content: 'Scenario loaded. Edit if needed, then press Send.' } });
            // Set input value via a custom event
            window.dispatchEvent(new CustomEvent('waypoint-set-input', { detail: DEFAULT_SCENARIO }));
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium
            bg-emerald-500/10 border border-emerald-500/25 text-emerald-400
            hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-colors"
        >
          <Target size={12} /> Scenario Planner
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 justify-center">
        {['What is this page about?', 'Click the first button', 'Fill in the form'].map(prompt => (
          <button
            key={prompt}
            onClick={() => handleExample(prompt)}
            className="px-3 py-1 rounded-full text-[11px] bg-surface-elevated border border-slate-700/50
              text-slate-300 hover:text-emerald-400 hover:border-emerald-500/40 transition-colors"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
