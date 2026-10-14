import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n/config'
import { RouterProvider } from 'react-router-dom'
import { router } from './router.tsx'

import { AuthProvider } from './context/AuthContext'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AppProviders from './components/AppProviders'
import { shouldRetryQuery } from './lib/rateLimit'

// No automatic retry of 4xx (429 included): a throttled request must not be re-sent by the client.
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: shouldRetryQuery } },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppProviders>
          <RouterProvider router={router} />
        </AppProviders>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
