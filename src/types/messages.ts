export type BackgroundMessage =
  | { type: 'BG_START'; url: string }
  | { type: 'BG_PAGE_LOADED'; url: string; tabId: number }
  | { type: 'BG_ACTION'; action: RecordedAction }
  | { type: 'BG_GET' }
  | { type: 'BG_STOP' }
  | { type: 'BG_RESET' }
  | { type: 'EXECUTE_ACTION'; action: string; selector?: string; value?: string; url?: string; [key: string]: unknown }
  | { type: 'GET_ACTIVE_TAB_URL' }
  | { type: 'CAPTURE_SCREENSHOT' }
  | { type: 'GET_ALL_TABS' }
  | { type: 'SWITCH_TO_TAB'; urlPattern: string }
  | { type: 'OPEN_OR_SWITCH_TAB'; url: string; urlPattern: string }
  | { type: 'READ_TAB_FIELDS'; urlPattern: string }
  | { type: 'READ_TAB_CONTENT'; tabId?: number; urlPattern?: string };

export type ContentMessage =
  | { action: 'startRecording' }
  | { action: 'resumeRecording' }
  | { action: 'stopRecording' }
  | { action: 'click'; selector: string }
  | { action: 'fill'; selector: string; value: string }
  | { action: 'waitAndClick'; selector: string }
  | { action: 'waitAndFill'; selector: string; value: string }
  | { action: 'navigate'; url: string }
  | { action: 'getPageContent' }
  | { action: 'extractDataFields' }
  | { action: 'getPageText' }
  | { action: 'getPageUrl' };

export interface RecordedAction {
  type: 'click' | 'fill' | 'navigate';
  selector?: string;
  text?: string;
  value?: string;
  placeholder?: string;
  url?: string;
  timestamp: number;
}

export interface PageContent {
  url: string;
  title: string;
  headings: string[];
  buttons: string[];
  inputs: string[];
  links: string[];
  bodyText: string;
}

export interface TabInfo {
  id: number;
  title: string;
  url: string;
}
