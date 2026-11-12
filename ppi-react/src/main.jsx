// Punto de entrada: monta RECORDATE en #root.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './recordate.css'
import './i18n/i18n.css'
import App from './App.jsx'
import { I18nProvider } from './i18n'
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>,
)
