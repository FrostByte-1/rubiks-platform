import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { ThemeProvider } from './theme/ThemeProvider.jsx'
import { CubeSettingsProvider } from './theme/CubeSettingsProvider.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <CubeSettingsProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </CubeSettingsProvider>
    </ThemeProvider>
  </React.StrictMode>,
)