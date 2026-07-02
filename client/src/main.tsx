import { createRoot } from 'react-dom/client'
import './index.css'
import App from '@/app/App'
import { BrowserRouter } from 'react-router-dom'
import { Providers } from '@/app/providers'
import { ConfirmProvider } from '@/shared/components/ConfirmDialog'

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
  <Providers>
  <ConfirmProvider>
  <App />
  </ConfirmProvider>
  </Providers>
  </BrowserRouter>,
)
