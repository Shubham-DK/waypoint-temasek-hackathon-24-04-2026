import type { Dispatch, MutableRefObject } from 'react';
import type { AppAction } from './context/AppContext';
import { msgId } from './context/AppContext';
import type { RecordedAction } from '../types/messages';

export function startRecording(
  dispatch: Dispatch<AppAction>,
  pollIntervalRef: MutableRefObject<ReturnType<typeof setInterval> | null>
): void {
  dispatch({ type: 'SET_RECORDING', isRecording: true });
  dispatch({ type: 'SET_STATUS', status: 'recording' });

  chrome.runtime.sendMessage({ type: 'BG_RESET' });
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'startRecording' });
    }
  });

  pollIntervalRef.current = setInterval(() => {
    chrome.runtime.sendMessage({ type: 'BG_GET' }, (resp: { actions?: RecordedAction[] }) => {
      if (resp?.actions) {
        dispatch({ type: 'SET_RECORDED_ACTIONS', actions: resp.actions });
      }
    });
  }, 600);
}

export function stopRecording(
  dispatch: Dispatch<AppAction>,
  pollIntervalRef: MutableRefObject<ReturnType<typeof setInterval> | null>
): void {
  dispatch({ type: 'SET_RECORDING', isRecording: false });
  dispatch({ type: 'SET_STATUS', status: 'idle' });

  if (pollIntervalRef.current) {
    clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = null;
  }

  chrome.runtime.sendMessage({ type: 'BG_STOP' }, (resp: { actions?: RecordedAction[] }) => {
    if (resp?.actions) {
      dispatch({ type: 'SET_RECORDED_ACTIONS', actions: resp.actions });
      dispatch({ type: 'ADD_MESSAGE', message: { id: msgId(), role: 'system', content: `Recording stopped. ${resp.actions.length} actions captured.` } });
    }
  });

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'stopRecording' });
    }
  });
}
