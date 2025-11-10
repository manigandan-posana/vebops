import React from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { store } from './app/store'
import App from './shell/App'
import './index.css'
import { Toaster } from 'react-hot-toast'
import { installGlobalEnterNavigation } from './utils/formNavigation'

installGlobalEnterNavigation();

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