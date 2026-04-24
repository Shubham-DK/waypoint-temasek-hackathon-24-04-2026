import { useApp } from '../context/AppContext';
import { stopRecording } from '../recording';

export function RecordingBar() {
  const { state, dispatch, pollIntervalRef } = useApp();
  if (!state.isRecording) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/8 border-b border-red-500/20 text-red-400 text-xs shrink-0">
      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
      <span>Recording interactions...</span>
      <button
        onClick={() => stopRecording(dispatch, pollIntervalRef)}
        className="ml-auto px-2 py-0.5 rounded bg-red-500 text-white text-[11px] font-semibold hover:bg-red-600 transition-colors"
      >
        Stop
      </button>
    </div>
  );
}
