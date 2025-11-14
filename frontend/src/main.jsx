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
                fontSize: '0.85rem',
                padding: '10px 16px',
                borderRadius: 8,
                border: '1px solid rgba(32,33,36,0.16)',
                background: '#FFFFFF',
                color: '#202124',
                boxShadow: '0 8px 24px rgba(32, 33, 36, 0.18)',
              },
              success: {
                iconTheme: {
                  primary: '#1A73E8',
                  secondary: '#FFFFFF',
                },
                style: {
                  background: '#E8F0FE',
                  color: '#1A73E8',
                  borderColor: 'rgba(26,115,232,0.2)',
                },
              },
              error: {
                iconTheme: {
                  primary: '#D93025',
                  secondary: '#FFFFFF',
                },
                style: {
                  background: '#FCE8E6',
                  color: '#D93025',
                  borderColor: 'rgba(217,48,37,0.2)',
                },
              },
              loading: {
                iconTheme: {
                  primary: '#1A73E8',
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
