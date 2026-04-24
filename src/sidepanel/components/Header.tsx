import { Compass, Rocket, Circle, FileText, BarChart3, Bot, BookOpen, Settings, Trash2, Plug, MessageSquare, Gauge } from 'lucide-react';
import { useApp, type PanelKey } from '../context/AppContext';
import { launchDemo } from '../demo';
import { startRecording } from '../recording';

const statusStyles: Record<string, string> = {
  idle: 'bg-slate-700 text-slate-400',
  recording: 'bg-red-500/15 text-red-400 animate-pulse-slow',
  busy: 'bg-emerald-500/15 text-emerald-400 animate-pulse-slow',
  done: 'bg-green-500/15 text-green-400',
};

interface IconBtnProps {
  icon: React.ReactNode;
  panel?: PanelKey;
  onClick?: () => void;
  title: string;
  active?: boolean;
}

function IconBtn({ icon, panel, onClick, title, active }: IconBtnProps) {
  const { state, dispatch } = useApp();
  const isActive = active ?? (panel ? state.activePanel === panel : false);

  const handleClick = () => {
    if (panel) dispatch({ type: 'SET_ACTIVE_PANEL', panel });
    onClick?.();
  };

  return (
    <button
      onClick={handleClick}
      title={title}
      className={`flex items-center justify-center w-8 h-8 rounded transition-colors
        ${isActive ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
    >
      {icon}
    </button>
  );
}

export function Header() {
  const { state, dispatch, pollIntervalRef } = useApp();

  return (
    <header className="flex items-center gap-2 px-3 py-2 bg-surface-base border-b border-slate-700/50 min-h-[48px] shrink-0">
      <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[15px]">
        <Compass size={18} />
        <span>Waypoint</span>
      </div>
      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide ${statusStyles[state.status]}`}>
        {state.status}
      </span>
      {state.messages.length > 0 && (
        <button
          onClick={() => dispatch({ type: 'CLEAR_CHAT' })}
          title="Clear chat"
          className="flex items-center justify-center w-7 h-7 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <Trash2 size={14} />
        </button>
      )}
      <div className="flex-1" />
      {/* Chat button: always navigates back to the chat view */}
      <button
        onClick={() => { if (state.activePanel !== null) dispatch({ type: 'SET_ACTIVE_PANEL', panel: state.activePanel }); }}
        title="Chat"
        className={`flex items-center justify-center w-8 h-8 rounded transition-colors
          ${state.activePanel === null ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
      >
        <MessageSquare size={16} />
      </button>
      <IconBtn icon={<Rocket size={16} />} onClick={() => launchDemo(dispatch)} title="Launch Demo" />
      <IconBtn icon={<Circle size={16} />} onClick={() => startRecording(dispatch, pollIntervalRef)} title="Record" active={state.isRecording} />
      <IconBtn icon={<FileText size={16} />} panel="wf" title="Workflows" />
      <IconBtn icon={<BarChart3 size={16} />} panel="ds" title="Data Source" />
      <IconBtn icon={<Bot size={16} />} panel="agents" title="Agents" />
      <IconBtn icon={<BookOpen size={16} />} panel="kb" title="Knowledge Base" />
      <IconBtn icon={<Gauge size={16} />} panel="perf" title="Performance" />
      <IconBtn icon={<Plug size={16} />} panel="mcp" title="MCP Store" />
      <IconBtn icon={<Settings size={16} />} panel="settings" title="Settings" />
    </header>
  );
}
