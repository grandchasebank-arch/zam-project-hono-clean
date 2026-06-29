import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientContextProvider } from './context/QueryClientContext'
import RootLayout from './routes/Root'
import Index from './routes/Index'
import Dashboard from './routes/Dashboard'
import Profile from './routes/Profile'
import Upgrade from './routes/Upgrade'
import History from './routes/History'
import Badges from './routes/Badges'
import Notifications from './routes/Notifications'
import Payment from './routes/Payment'
import Login from './routes/Auth/Login'

function ErrorBoundary() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">This page didn't load</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Something went wrong on our end.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <a
            href="/"
            className="rounded-xl bg-[var(--text)] px-4 py-2 text-sm font-bold text-[var(--bg)]"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  )
}

export function App() {
  return (
    <QueryClientContextProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<RootLayout />}>
            <Route path="/" element={<Index />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/upgrade" element={<Upgrade />} />
            <Route path="/history" element={<History />} />
            <Route path="/badges" element={<Badges />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/payment" element={<Payment />} />
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<ErrorBoundary />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientContextProvider>
  )
}
