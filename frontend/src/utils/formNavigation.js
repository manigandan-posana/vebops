const FOCUSABLE_SELECTOR =
  'input:not([type=hidden]):not(:disabled),' +
  ' select:not(:disabled),' +
  ' textarea:not(:disabled),' +
  ' button:not(:disabled),' +
  ' [tabindex]:not([tabindex="-1"])';

const isVisible = (el) => {
  if (!el) return false;
  if (el.offsetParent !== null) return true;
  if (typeof window === 'undefined' || typeof window.getComputedStyle !== 'function') {
    return false;
  }
  const style = window.getComputedStyle(el);
  return style ? style.position === 'fixed' : false;
};

function getFocusable(form) {
  if (!form) return [];
  return Array.from(form.querySelectorAll(FOCUSABLE_SELECTOR)).filter((el) => {
    if (!el) return false;
    if (el.disabled) return false;
    if (el.getAttribute('aria-hidden') === 'true') return false;
    const type = (el.getAttribute('type') || '').toLowerCase();
    if (type === 'hidden') return false;
    if (!isVisible(el)) return false;
    return typeof el.focus === 'function';
  });
}

function moveFocus(form, current, direction) {
  if (!form || !current) return false;
  const focusable = getFocusable(form);
  if (!focusable.length) return false;
  let index = focusable.indexOf(current);
  if (index === -1) {
    index = 0;
  }
  let nextIndex = index + direction;
  while (nextIndex >= 0 && nextIndex < focusable.length) {
    const candidate = focusable[nextIndex];
    if (candidate && candidate !== current) {
      candidate.focus({ preventScroll: false });
      const tag = candidate.tagName;
      const type = (candidate.getAttribute('type') || '').toLowerCase();
      if (
        tag === 'INPUT' &&
        !['checkbox', 'radio', 'button', 'submit', 'reset', 'file'].includes(type) &&
        typeof candidate.select === 'function'
      ) {
        candidate.select();
      }
      return true;
    }
    nextIndex += direction;
  }
  return false;
}

function shouldHandle(element, event) {
  if (!element || !event) return false;
  if (element.dataset && element.dataset.enterNav === 'skip') return false;
  const tag = element.tagName;
  if (!['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(tag) && element.getAttribute('tabindex') === null) {
    return false;
  }
  const type = (element.getAttribute('type') || '').toLowerCase();
  if (['submit', 'button', 'reset'].includes(type)) {
    return false;
  }
  if (element.dataset && element.dataset.allowEnter === 'true') {
    return false;
  }
  if (tag === 'TEXTAREA') {
    if (event.shiftKey || event.altKey || event.metaKey || event.ctrlKey) {
      return false;
    }
  }
  return true;
}

export function focusNextOnEnter(event) {
  if (!event || event.key !== 'Enter') return;
  const target = event.currentTarget || event.target;
  if (!shouldHandle(target, event)) return;
  const form = target?.form || target?.closest?.('form');
  if (!form) return;
  const direction = event.shiftKey ? -1 : 1;
  const moved = moveFocus(form, target, direction);
  if (moved) {
    event.preventDefault();
    return;
  }
  if (direction > 0) {
    event.preventDefault();
    if (typeof form.requestSubmit === 'function') {
      form.requestSubmit();
    } else if (typeof form.submit === 'function') {
      form.submit();
    }
  }
}

let installed = false;

export function installGlobalEnterNavigation() {
  if (installed || typeof document === 'undefined') return;
  const handler = (event) => {
    if (!event || event.defaultPrevented || event.key !== 'Enter') return;
    const target = event.target;
    if (!shouldHandle(target, event)) return;
    const form = target?.form || target?.closest?.('form');
    if (!form) return;
    const direction = event.shiftKey ? -1 : 1;
    const moved = moveFocus(form, target, direction);
    if (moved) {
      event.preventDefault();
      return;
    }
    if (direction > 0) {
      event.preventDefault();
      if (typeof form.requestSubmit === 'function') {
        form.requestSubmit();
      } else if (typeof form.submit === 'function') {
        form.submit();
      }
    }
  };
  document.addEventListener('keydown', handler, true);
  installed = true;
}
