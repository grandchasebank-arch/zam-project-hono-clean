import React from 'react'
import ReactDOM from 'react-dom/client'
import { Toaster } from 'sonner'
import { initDevSession } from './lib/api'
import { App } from './App.tsx'
import './styles.css'

initDevSession()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <Toaster
      position="top-right"
      richColors
      closeButton
      duration={4000}
    />
  </React.StrictMode>,
)
