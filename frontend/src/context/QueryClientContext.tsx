import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode, createContext, useContext } from 'react'

// Create a singleton QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
    },
  },
})

// Create context for accessing QueryClient
const QueryClientContext = createContext<QueryClient | undefined>(undefined)

export function QueryClientContextProvider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <QueryClientContext.Provider value={queryClient}>
        {children}
      </QueryClientContext.Provider>
    </QueryClientProvider>
  )
}

export function useQueryClient(): QueryClient {
  const context = useContext(QueryClientContext)
  if (!context) {
    throw new Error('useQueryClient must be used within QueryClientContextProvider')
  }
  return context
}
