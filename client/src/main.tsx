import { createRoot } from 'react-dom/client'
import './index.css'
import App from '@/app/App'
import { BrowserRouter } from 'react-router-dom'
import { ConfirmProvider } from '@/shared/components/ui/ConfirmDialog'
import { initTheme } from '@/shared/lib/theme'

// Apply the stored (or default light) theme before the first paint.
initTheme()

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
  <ConfirmProvider>
  <App />
  </ConfirmProvider>
  </BrowserRouter>,
)
