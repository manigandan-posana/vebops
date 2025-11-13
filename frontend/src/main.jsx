import React from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { store } from './app/store'
import App from './shell/App'
import './index.css'
import { Toaster } from 'react-hot-toast'
import { installGlobalEnterKeyNavigation } from './utils/enterKeyNavigation'
import theme from './theme'

installGlobalEnterKeyNavigation();

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <App />
          <Toaster
            position='top-right'
            gutter={12}
            containerStyle={{ top: 20, right: 20 }}
            toastOptions={{
              duration: 4200,
              style: {
                fontSize: '0.75rem',
                padding: '12px 18px',
                borderRadius: 12,
                border: '1px solid rgba(15,23,42,0.12)',
                background: '#0F172A',
                color: '#FFFFFF',
                boxShadow: '0 16px 44px rgba(15, 23, 42, 0.35)',
              },
              success: {
                iconTheme: {
                  primary: '#00FF00',
                  secondary: '#0F172A',
                },
                style: {
                  background: '#00FF00',
                  color: '#003300',
                  borderColor: 'rgba(0,51,0,0.24)',
                },
              },
              error: {
                iconTheme: {
                  primary: '#FF0000',
                  secondary: '#FFFFFF',
                },
                style: {
                  background: '#FF0000',
                  color: '#FFFFFF',
                  borderColor: 'rgba(255,255,255,0.24)',
                },
              },
              loading: {
                iconTheme: {
                  primary: '#0000FF',
                  secondary: '#FFFFFF',
                },
              },
            }}
          />
        </BrowserRouter>
      </ThemeProvider>
    </Provider>
  </React.StrictMode>
);
