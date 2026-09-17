import React from 'react'
import ReactDOM from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <Toaster
      position="bottom-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: '#22222f',
          color: '#f1f1f5',
          border: '1px solid #2e2e3d',
          borderRadius: '12px',
          fontSize: '14px',
        },
        success: {
          iconTheme: { primary: '#10b981', secondary: '#22222f' },
        },
        error: {
          iconTheme: { primary: '#ef4444', secondary: '#22222f' },
        },
      }}
    />
  </React.StrictMode>
)
