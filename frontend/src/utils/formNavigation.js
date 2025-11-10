export function focusNextOnEnter(event) {
  if (event.key !== 'Enter') return;
  const form = event.currentTarget?.form;
  if (!form) return;
  const focusable = Array.from(
    form.querySelectorAll(
      'input, select, textarea, button, [tabindex]'
    )
  ).filter((el) =>
    !el.disabled &&
    el.tabIndex !== -1 &&
    el.offsetParent !== null &&
    typeof el.focus === 'function'
  );
  const index = focusable.indexOf(event.currentTarget);
  if (index === -1) return;
  const next = focusable[index + 1];
  if (next) {
    event.preventDefault();
    next.focus();
  }
}
