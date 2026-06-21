'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

interface User {
  id: string
  email: string
  name: string
  role: string
}

interface Session {
  user: User | null
  expires?: string
}

interface AuthContextType {
  session: Session | null
  status: 'loading' | 'authenticated' | 'unauthenticated'
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
  const [session, setSession] = useState<Session | null>(null)
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading')

  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
      })

      if (res.ok) {
        const data = await res.json()
        if (data.user) {
          setSession({ user: data.user, expires: data.expires })
          setStatus('authenticated')
          return
        }
      }

      setSession({ user: null })
      setStatus('unauthenticated')
    } catch (error) {
      console.error('[AuthProvider] refreshSession error:', error)
      setSession({ user: null })
      setStatus('unauthenticated')
    }
  }, [])

  // Check session on mount
  useEffect(() => {
    refreshSession()
  }, [refreshSession])

  // Refresh session on window focus
  useEffect(() => {
    const handleFocus = () => {
      if (status === 'authenticated') {
        refreshSession()
      }
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [status, refreshSession])

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
        credentials: 'include',
      })

      const data = await res.json()

      if (!res.ok) {
        return { success: false, error: data.error || 'Error al iniciar sesión.' }
      }

      if (data.success && data.user) {
        // Update session immediately without additional fetch
        setSession({
          user: data.user,
          expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
        setStatus('authenticated')
        return { success: true }
      }

      return { success: false, error: 'No se pudo iniciar sesión.' }
    } catch (error) {
      console.error('[AuthProvider] login error:', error)
      return { success: false, error: 'Error de conexión. Intente nuevamente.' }
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } catch (error) {
      console.error('[AuthProvider] logout error:', error)
    } finally {
      setSession({ user: null })
      setStatus('unauthenticated')
    }
  }, [])

  return (
    <AuthContext.Provider value={{ session, status, login, logout, refreshSession }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Compatibility hook that mimics useSession() interface from next-auth
// Returns { data: session, status } so components can migrate with minimal changes
export function useSession() {
  const { session, status } = useAuth()
  return {
    data: session,
    status,
    update: async () => {},
  }
}

// Compatibility signOut function that mimics next-auth's signOut
export async function signOut(options?: { redirect?: boolean; callbackUrl?: string }) {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    })
  } catch (error) {
    console.error('[Auth] signOut error:', error)
  }

  // Force a full page reload to clear all state
  if (options?.callbackUrl) {
    window.location.href = options.callbackUrl
  } else {
    window.location.href = '/'
  }
}
