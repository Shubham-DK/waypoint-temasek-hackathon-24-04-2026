(function () {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  if (w.__waypointLoaded) return;
  w.__waypointLoaded = true;

  // --- Helpers ---

  const NOISY_CLASSES = /__safly|__grammarly|__lp_|notranslate|translated-|extensionid/i;

  function getBestSelector(el: Element): string {
    if (el.id) return `#${el.id}`;
    const testId = el.getAttribute('data-testid');
    if (testId) return `[data-testid="${testId}"]`;
    const name = el.getAttribute('name');
    if (name) return `${el.tagName.toLowerCase()}[name="${name}"]`;
    const classes = Array.from(el.classList).filter(c => !NOISY_CLASSES.test(c));
    if (classes.length) return `${el.tagName.toLowerCase()}.${classes.join('.')}`;
    return el.tagName.toLowerCase();
  }

  function getVisibleText(el: Element): string {
    const text = (el as HTMLElement).innerText
      || (el as HTMLInputElement).value
      || el.getAttribute('placeholder')
      || el.getAttribute('aria-label')
      || '';
    return text.trim().slice(0, 60);
  }

  function sendAction(action: Record<string, unknown>): void {
    try {
      chrome.runtime.sendMessage({ type: 'BG_ACTION', action });
    } catch {
      // Extension context invalidated
    }
  }

  // --- Recording ---

  let recording = false;

  function onClickCapture(e: MouseEvent): void {
    if (!recording) return;
    const el = e.target as Element;
    if (!el) return;
    sendAction({
      type: 'click',
      selector: getBestSelector(el),
      text: getVisibleText(el),
      timestamp: Date.now(),
    });
  }

  function onInputCapture(e: Event): void {
    if (!recording) return;
    const el = e.target as HTMLInputElement;
    if (!el || !['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) return;
    sendAction({
      type: 'fill',
      selector: getBestSelector(el),
      placeholder: el.getAttribute('placeholder') || '',
      value: el.value,
      timestamp: Date.now(),
    });
  }

  function attachRecorder(): void {
    recording = true;
    document.addEventListener('click', onClickCapture, true);
    document.addEventListener('input', onInputCapture, true);
  }

  function detachRecorder(): void {
    recording = false;
    document.removeEventListener('click', onClickCapture, true);
    document.removeEventListener('input', onInputCapture, true);
  }

  // --- Page Content Extraction ---

  function getInputLabel(el: Element): string {
    const id = el.id;
    if (id) {
      const labelEl = document.querySelector(`label[for="${id}"]`);
      if (labelEl) return labelEl.textContent?.trim().slice(0, 40) || '';
    }
    const closest = el.closest('label');
    if (closest) return closest.textContent?.trim().slice(0, 40) || '';
    return el.getAttribute('aria-label')
      || el.getAttribute('placeholder')
      || el.getAttribute('name')
      || '';
  }

  function extractPageContent(): Record<string, unknown> {
    const headings = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6'))
      .slice(0, 15)
      .map(h => `${h.tagName}: ${h.textContent?.trim().slice(0, 80)}`);

    const buttons = Array.from(
      document.querySelectorAll('button, [role="button"], input[type="submit"], a.btn')
    )
      .slice(0, 25)
      .map(b => `Button: "${getVisibleText(b)}" [${getBestSelector(b)}]`);

    const inputs = Array.from(
      document.querySelectorAll('input:not([type="hidden"]), textarea, select')
    )
      .slice(0, 20)
      .map(i => {
        const inp = i as HTMLInputElement;
        const type = inp.type || inp.tagName.toLowerCase();
        const label = getInputLabel(i);
        return `Input[${type}]: "${label}" [${getBestSelector(i)}] value="${(inp.value || '').slice(0, 40)}"`;
      });

    const links = Array.from(document.querySelectorAll('a[href]'))
      .slice(0, 15)
      .map(a => {
        const anchor = a as HTMLAnchorElement;
        return `Link: "${getVisibleText(a)}" → ${anchor.href}`;
      });

    return {
      url: location.href,
      title: document.title,
      headings,
      buttons,
      inputs,
      links,
      bodyText: (document.body.innerText || '').slice(0, 4000),
    };
  }

  // --- DOM Action Helpers ---

  function waitForElement(selector: string, timeout: number = 6000): Promise<HTMLElement | null> {
    return new Promise(resolve => {
      const start = Date.now();
      const poll = () => {
        const el = document.querySelector(selector) as HTMLElement | null;
        if (el && el.offsetParent !== null) {
          resolve(el);
        } else if (Date.now() - start > timeout) {
          resolve(el); // return even if not visible after timeout
        } else {
          setTimeout(poll, 200);
        }
      };
      poll();
    });
  }

  // --- Message Handler ---

  chrome.runtime.onMessage.addListener(
    (msg: Record<string, unknown>, _sender: chrome.runtime.MessageSender, sendResponse: (r: unknown) => void) => {
      const action = (msg.action || msg.type) as string;

      switch (action) {
        case 'startRecording': {
          chrome.runtime.sendMessage({ type: 'BG_START', url: location.href });
          attachRecorder();
          sendResponse({ success: true });
          break;
        }

        case 'resumeRecording': {
          attachRecorder();
          sendResponse({ success: true });
          break;
        }

        case 'stopRecording': {
          detachRecorder();
          sendResponse({ success: true });
          break;
        }

        case 'click': {
          const el = document.querySelector(msg.selector as string);
          if (el) {
            (el as HTMLElement).click();
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: `Element not found: ${msg.selector}` });
          }
          break;
        }

        case 'fill': {
          const el = document.querySelector(msg.selector as string) as HTMLInputElement | null;
          if (el) {
            el.focus();
            el.value = msg.value as string;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: `Element not found: ${msg.selector}` });
          }
          break;
        }

        case 'waitAndClick': {
          waitForElement(msg.selector as string).then(el => {
            if (el) {
              el.click();
              sendResponse({ success: true });
            } else {
              sendResponse({ success: false, error: `Element not found after wait: ${msg.selector}` });
            }
          });
          return; // async — don't break
        }

        case 'waitAndFill': {
          waitForElement(msg.selector as string).then(el => {
            if (el) {
              const inp = el as HTMLInputElement;
              inp.focus();
              inp.value = msg.value as string;
              inp.dispatchEvent(new Event('input', { bubbles: true }));
              inp.dispatchEvent(new Event('change', { bubbles: true }));
              sendResponse({ success: true });
            } else {
              sendResponse({ success: false, error: `Element not found after wait: ${msg.selector}` });
            }
          });
          return; // async — don't break
        }

        case 'navigate': {
          window.location.href = msg.url as string;
          sendResponse({ success: true });
          break;
        }

        case 'getPageContent': {
          sendResponse(extractPageContent());
          break;
        }

        case 'extractDataFields': {
          const fields: Record<string, string> = {};
          document.querySelectorAll('[data-waypoint-field]').forEach(el => {
            const key = el.getAttribute('data-waypoint-field');
            if (key) fields[key] = el.textContent?.trim() || '';
          });
          sendResponse({ fields });
          break;
        }

        case 'getPageText': {
          sendResponse({ text: (document.body.innerText || '').slice(0, 8000) });
          break;
        }

        case 'getPageUrl': {
          sendResponse({ url: location.href });
          break;
        }

        default: {
          sendResponse({ success: false, error: `Unknown action: ${action}` });
          break;
        }
      }

      return true; // keep channel open for async
    }
  );

  // --- On-Load: Signal to background ---
  try {
    chrome.runtime.sendMessage({
      type: 'BG_PAGE_LOADED',
      url: location.href,
      tabId: 0, // background will use sender.tab.id
    });
  } catch {
    // Extension context invalidated
  }
})();
