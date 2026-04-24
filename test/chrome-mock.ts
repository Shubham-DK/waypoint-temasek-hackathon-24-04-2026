type Listener = (...args: unknown[]) => void;

function createEventMock() {
  const listeners: Listener[] = [];
  return {
    addListener: (fn: Listener) => listeners.push(fn),
    removeListener: (fn: Listener) => {
      const i = listeners.indexOf(fn);
      if (i >= 0) listeners.splice(i, 1);
    },
    hasListeners: () => listeners.length > 0,
    _fire: (...args: unknown[]) => listeners.forEach(fn => fn(...args)),
    _listeners: listeners,
  };
}

let storageData: Record<string, unknown> = {};

export function createChromeMock() {
  storageData = {};

  return {
    runtime: {
      sendMessage: vi.fn((_msg: unknown, callback?: (r: unknown) => void) => {
        callback?.({ ok: true });
      }),
      onMessage: createEventMock(),
      getURL: vi.fn((path: string) => `chrome-extension://fake-id/${path}`),
    },

    storage: {
      local: {
        get: vi.fn((keys: string | string[]) => {
          if (typeof keys === 'string') {
            return Promise.resolve({ [keys]: storageData[keys] });
          }
          const result: Record<string, unknown> = {};
          for (const k of keys) result[k] = storageData[k];
          return Promise.resolve(result);
        }),
        set: vi.fn((items: Record<string, unknown>) => {
          Object.assign(storageData, items);
          return Promise.resolve();
        }),
        remove: vi.fn((keys: string | string[]) => {
          const arr = typeof keys === 'string' ? [keys] : keys;
          for (const k of arr) delete storageData[k];
          return Promise.resolve();
        }),
      },
    },

    tabs: {
      query: vi.fn(() => Promise.resolve([])),
      update: vi.fn(() => Promise.resolve({})),
      create: vi.fn(() => Promise.resolve({ id: 999 })),
      sendMessage: vi.fn(() => Promise.resolve({ success: true })),
    },

    windows: {
      update: vi.fn(() => Promise.resolve({})),
    },

    scripting: {
      executeScript: vi.fn(() => Promise.resolve([{ result: true }])),
    },

    action: {
      onClicked: createEventMock(),
    },

    sidePanel: {
      open: vi.fn(() => Promise.resolve()),
    },
  };
}

export function seedStorage(data: Record<string, unknown>) {
  storageData = { ...data };
}

export function getStorageData() {
  return { ...storageData };
}
