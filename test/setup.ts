import { createChromeMock } from './chrome-mock';

beforeEach(() => {
  const mock = createChromeMock();
  (globalThis as Record<string, unknown>).chrome = mock;
});

afterEach(() => {
  vi.restoreAllMocks();
});
