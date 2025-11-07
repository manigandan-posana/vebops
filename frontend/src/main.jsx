import React from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { store } from './app/store'
import App from './shell/App'
import './index.css'
import { Toaster } from 'react-hot-toast'

/**
 * Enable keyboard navigation throughout the application by listening
 * for the Enter key on input elements. When the Enter key is pressed,
 * focus moves to the next focusable element within the same form rather
 * than submitting the form or doing nothing. This global handler helps
 * reduce reliance on the mouse by allowing users to progress through
 * forms using only the keyboard. The handler runs once on application
 * startup and cleans itself up automatically on reloads.
 */
if (typeof document !== 'undefined') {
  document.addEventListener('keydown', (e) => {
    // Only handle Enter on form inputs/selects/textarea
    if (e.key === 'Enter') {
      const target = e.target;
      const tag = target.tagName;
      // Skip if target is a button or doesn't belong to a form
      if (!['INPUT', 'SELECT', 'TEXTAREA'].includes(tag)) return;
      const form = target.form;
      if (!form) return;
      // Prevent default submit behaviour
      e.preventDefault();
      // Build a list of focusable elements within the form
      const focusable = Array.from(
        form.querySelectorAll(
          'input:not([type=hidden]):not(:disabled), select:not(:disabled), textarea:not(:disabled), button:not(:disabled)'
        )
      );
      const index = focusable.indexOf(target);
      if (index >= 0) {
        const next = focusable[index + 1];
        if (next) {
          next.focus();
        }
      }
    }
  });
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <App/>
        <Toaster />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
)