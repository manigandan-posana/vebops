const FOCUSABLE_INPUT_SELECTOR = [
  'input:not([type="hidden"]):not([type="button"]):not([type="submit"]):not([type="reset"])',
  'select',
  'textarea'
].join(',');

const isInteractive = (el) => {
  if (!el) return false;
  if (el.disabled || el.getAttribute('aria-disabled') === 'true') return false;
  const tag = el.tagName;
  if (!tag) return false;
  if (tag === 'INPUT') {
    const type = (el.getAttribute('type') || '').toLowerCase();
    if (type === 'hidden' || type === 'button' || type === 'submit' || type === 'reset') return false;
  }
  if (el.readOnly) return false;
  if (el.getAttribute('data-enter-skip') === 'true') return false;
  if (el.type === 'checkbox' || el.type === 'radio') {
    return typeof el.focus === 'function';
  }
  return typeof el.focus === 'function';
};

const isVisible = (el) => {
  if (!el) return false;
  if (el.offsetParent !== null) return true;
  if (typeof window === 'undefined' || typeof window.getComputedStyle !== 'function') {
    return false;
  }
  const style = window.getComputedStyle(el);
  return style && style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
};

const getInputsInForm = (form) => {
  if (!form) return [];
  return Array.from(form.querySelectorAll(FOCUSABLE_INPUT_SELECTOR)).filter((el) => isInteractive(el) && isVisible(el));
};

const focusField = (el) => {
  if (!el) return false;
  el.focus({ preventScroll: false });
  const tag = el.tagName;
  const type = (el.getAttribute('type') || '').toLowerCase();
  if (
    tag === 'INPUT' &&
    !['checkbox', 'radio', 'file', 'button', 'submit', 'reset'].includes(type) &&
    typeof el.select === 'function'
  ) {
    el.select();
  }
  return true;
};

export const focusNextInputOnEnter = (event, forcedTarget) => {
  if (!event || event.key !== 'Enter') return;
  const target = forcedTarget || event.target || event.currentTarget;
  if (!target) return;

  if (target.tagName === 'TEXTAREA' && target.dataset.enterFocus !== 'true') {
    return;
  }

  const form = target.form || (typeof target.closest === 'function' ? target.closest('form') : null);
  if (!form) return;

  const inputs = getInputsInForm(form);
  if (!inputs.length) return;

  const direction = event.shiftKey ? -1 : 1;
  const currentIndex = inputs.indexOf(target);
  let nextIndex = currentIndex === -1 ? (direction > 0 ? 0 : inputs.length - 1) : currentIndex + direction;

  while (nextIndex >= 0 && nextIndex < inputs.length) {
    const candidate = inputs[nextIndex];
    if (candidate && candidate !== target) {
      event.preventDefault();
      focusField(candidate);
      return;
    }
    nextIndex += direction;
  }

  // Prevent submitting the form when Enter is pressed on the last field.
  event.preventDefault();
};

let installed = false;

export const installGlobalEnterKeyNavigation = () => {
  if (installed || typeof document === 'undefined') return;
  const handler = (event) => {
    if (!event || event.defaultPrevented || event.key !== 'Enter') return;
    const target = event.target;
    if (!target) return;
    focusNextInputOnEnter(event, target);
  };
  document.addEventListener('keydown', handler, true);
  installed = true;
};
