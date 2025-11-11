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
          <Toaster />
        </BrowserRouter>
      </ThemeProvider>
    </Provider>
  </React.StrictMode>
);