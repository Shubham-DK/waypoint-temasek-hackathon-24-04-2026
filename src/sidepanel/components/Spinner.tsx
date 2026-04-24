import { useApp } from '../context/AppContext';

export function Spinner() {
  const { state } = useApp();
  if (!state.spinnerLabel) return null;

  return (
    <div className="flex items-center justify-center gap-2 py-3 shrink-0">
      <div className="flex gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-dot-bounce" />
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-dot-bounce dot-delay-1" />
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-dot-bounce dot-delay-2" />
      </div>
      <span className="text-xs text-slate-400">{state.spinnerLabel}</span>
    </div>
  );
}
