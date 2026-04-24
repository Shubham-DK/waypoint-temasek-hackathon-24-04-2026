import { useRef, useEffect, useCallback } from 'react';
import { Send } from 'lucide-react';
import { useApp, msgId } from '../context/AppContext';
import { maskPII, hasPII } from '../pii';
import { handleSend as chatHandleSend } from '../chat-handler';
import { buildScenarioPlan } from '../scenario';

export function InputArea() {
  const { state, dispatch, pendingResumeRef } = useApp();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Listen for external input value setting (from WelcomeCard scenario chip)
  useEffect(() => {
    const handler = (e: Event) => {
      const text = (e as CustomEvent).detail;
      if (textareaRef.current) {
        textareaRef.current.value = text;
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
      }
    };
    window.addEventListener('waypoint-set-input', handler);
    return () => window.removeEventListener('waypoint-set-input', handler);
  }, []);

  const handleSend = useCallback(async () => {
    const text = textareaRef.current?.value?.trim();
    if (!text) return;
    textareaRef.current!.value = '';
    textareaRef.current!.style.height = 'auto';

    // If waiting for user input during plan execution
    if (pendingResumeRef.current) {
      const resume = pendingResumeRef.current;
      pendingResumeRef.current = null;
      const safeText = state.piiMaskEnabled ? maskPII(text) : text;
      dispatch({ type: 'ADD_MESSAGE', message: { id: msgId(), role: 'user', content: text, hasPII: hasPII(text) } });
      resume(safeText);
      return;
    }

    // If scenario planner pending
    if (state.pendingScenario) {
      dispatch({ type: 'SET_PENDING_SCENARIO', pending: false });
      dispatch({ type: 'ADD_MESSAGE', message: { id: msgId(), role: 'user', content: text } });
      await buildScenarioPlan(text, state, dispatch);
      return;
    }

    // Normal chat
    dispatch({ type: 'ADD_MESSAGE', message: { id: msgId(), role: 'user', content: text, hasPII: hasPII(text) } });
    await chatHandleSend(text, state, dispatch, pendingResumeRef);
  }, [state, dispatch, pendingResumeRef]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
    if (!ta.value.trim()) {
      dispatch({ type: 'SET_PENDING_SCENARIO', pending: false });
    }
  };

  return (
    <div className="flex gap-2 p-3 border-t border-slate-700/50 bg-surface-card shrink-0 items-end">
      <textarea
        ref={textareaRef}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        placeholder="Ask Waypoint anything..."
        rows={1}
        className="flex-1 bg-surface-base border border-slate-700/50 rounded-lg text-slate-100 px-3 py-2 text-[13px] font-body
          resize-none min-h-[38px] max-h-[120px] outline-none leading-relaxed
          focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-colors
          placeholder:text-slate-500"
      />
      <button
        onClick={handleSend}
        className="flex items-center justify-center w-[38px] h-[38px] rounded-lg bg-emerald-600 text-white
          hover:bg-emerald-700 transition-colors shrink-0"
      >
        <Send size={16} />
      </button>
    </div>
  );
}
