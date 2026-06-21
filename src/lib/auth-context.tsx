'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: string
}

export interface AuthSession {
  user: AuthUser
  expires?: string
}

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

interface AuthContextType {
  session: AuthSession | null
  status: AuthStatus
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  status: 'loading',
  login: async () => ({ success: false }),
  logout: async () => {},
  refreshSession: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')

  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', {
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        setSession(data)
        setStatus('authenticated')
      } else {
        setSession(null)
        setStatus('unauthenticated')
      }
    } catch {
      setSession(null)
      setStatus('unauthenticated')
    }
  }, [])

  const login = useCallback(
    async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
          credentials: 'include',
        })

        const data = await res.json()

        if (!res.ok) {
          return { success: false, error: data.error || 'Error al iniciar sesión' }
        }

        setSession({ user: data.user })
        setStatus('authenticated')
        return { success: true }
      } catch {
        return { success: false, error: 'Error de conexión' }
      }
    },
    []
  )

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } catch {
      // ignore
    }
    setSession(null)
    setStatus('unauthenticated')
  }, [])

  useEffect(() => {
    refreshSession()
  }, [refreshSession])

  // Refrescar sesión cuando la ventana gana foco
  useEffect(() => {
    const onFocus = () => {
      refreshSession()
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [refreshSession])

  return (
    <AuthContext.Provider value={{ session, status, login, logout, refreshSession }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider')
  }
  return context
}
