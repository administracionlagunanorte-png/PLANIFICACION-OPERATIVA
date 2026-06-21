'use client'

import { useState } from 'react'
import { AuthProvider, useAuth } from '@/lib/auth-context'
import dynamic from 'next/dynamic'
import LoginForm from '@/components/auth/LoginForm'

const HomeClient = dynamic(() => import('./HomeClient'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
    </div>
  ),
})

function AppContent() {
  const { status } = useAuth()
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  if (status === 'loading' && !isLoggedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
      </div>
    )
  }

  if (status === 'unauthenticated' && !isLoggedIn) {
    return <LoginForm onLoginSuccess={() => setIsLoggedIn(true)} />
  }

  return <HomeClient onAuthExpired={() => setIsLoggedIn(false)} />
}

export default function Home() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
