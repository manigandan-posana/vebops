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
            gutter={10}
            containerStyle={{ top: 18, right: 18 }}
            toastOptions={{
              duration: 4200,
              style: {
                fontSize: '0.75rem',
                padding: '10px 16px',
                borderRadius: 2,
                border: '1px solid rgba(0,0,255,0.18)',
                background: '#000033',
                color: '#FFFFFF',
                boxShadow: '0 18px 42px rgba(0,0,51,0.3)',
              },
              success: {
                iconTheme: {
                  primary: '#003300',
                  secondary: '#99FF99',
                },
                style: {
                  background: '#00FF00',
                  color: '#003300',
                },
              },
              error: {
                iconTheme: {
                  primary: '#FF3B30',
                  secondary: '#FFE0DD',
                },
                style: {
                  background: '#FF3B30',
                  color: '#FFFFFF',
                },
              },
            }}
          />
        </BrowserRouter>
      </ThemeProvider>
    </Provider>
  </React.StrictMode>
);
