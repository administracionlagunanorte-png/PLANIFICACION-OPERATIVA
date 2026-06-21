'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Shield, Eye, EyeOff, LogIn, UserPlus, AlertCircle, Building2, KeyRound } from 'lucide-react'

interface LoginFormProps {
  onLoginSuccess: () => void
}

export default function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const { login, status } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showRegister, setShowRegister] = useState(false)

  // Estado para registro
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirmPassword, setRegConfirmPassword] = useState('')
  const [regRole, setRegRole] = useState('USER')
  const [regError, setRegError] = useState('')
  const [regLoading, setRegLoading] = useState(false)
  const [regSuccess, setRegSuccess] = useState(false)

  // Verificar si es primera vez (no hay usuarios)
  const [isFirstTime, setIsFirstTime] = useState(false)

  useEffect(() => {
    checkFirstTime()
  }, [])

  const checkFirstTime = async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' })
      if (res.ok) {
        onLoginSuccess()
        return
      }
    } catch {
      // No autenticado, mostrar login
    }

    // Verificar si hay usuarios en la base de datos
    try {
      const res = await fetch('/api/users', { credentials: 'include' })
      if (res.status === 401) {
        // No autenticado - podría ser primera vez
        setIsFirstTime(true)
      } else {
        setIsFirstTime(false)
      }
    } catch {
      setIsFirstTime(true)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const result = await login(email, password)
      if (result.success) {
        onLoginSuccess()
      } else {
        setError(result.error || 'Error al iniciar sesión')
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setRegError('')

    if (regPassword !== regConfirmPassword) {
      setRegError('Las contraseñas no coinciden')
      return
    }

    if (regPassword.length < 6) {
      setRegError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setRegLoading(true)

    try {
      // Si es primera vez, usar seed-admin
      const endpoint = isFirstTime ? '/api/auth/seed-admin' : '/api/auth/register'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName,
          email: regEmail,
          password: regPassword,
          role: isFirstTime ? 'ADMIN' : regRole,
        }),
        credentials: 'include',
      })

      const data = await res.json()

      if (!res.ok) {
        setRegError(data.error || 'Error al registrar usuario')
        return
      }

      setRegSuccess(true)

      // Auto-login después del registro
      const loginResult = await login(regEmail, regPassword)
      if (loginResult.success) {
        onLoginSuccess()
      }
    } catch {
      setRegError('Error de conexión')
    } finally {
      setRegLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4">
      {/* Fondo decorativo */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo y título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 mb-4">
            <Building2 className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Planificación Operativa</h1>
          <p className="text-slate-400 mt-1">Laguna Norte - Mantención</p>
        </div>

        {!showRegister ? (
          /* =================== LOGIN FORM =================== */
          <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-xl shadow-2xl">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-xl text-white flex items-center gap-2">
                <LogIn className="w-5 h-5 text-blue-400" />
                Iniciar Sesión
              </CardTitle>
              <CardDescription className="text-slate-400">
                Ingresa tus credenciales para acceder al sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                {error && (
                  <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-300">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-300">
                    Correo electrónico
                  </Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      placeholder="correo@ejemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-300">
                    Contraseña
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Iniciando sesión...
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4 mr-2" />
                      Iniciar Sesión
                    </>
                  )}
                </Button>

                {isFirstTime && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setShowRegister(true)}
                      className="w-full text-center text-sm text-blue-400 hover:text-blue-300 transition-colors flex items-center justify-center gap-2"
                    >
                      <UserPlus className="w-4 h-4" />
                      Crear cuenta de administrador
                    </button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        ) : (
          /* =================== REGISTER FORM =================== */
          <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-xl shadow-2xl">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-xl text-white flex items-center gap-2">
                {isFirstTime ? (
                  <>
                    <Shield className="w-5 h-5 text-amber-400" />
                    Crear Administrador
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5 text-green-400" />
                    Registrar Usuario
                  </>
                )}
              </CardTitle>
              <CardDescription className="text-slate-400">
                {isFirstTime
                  ? 'Primer uso: crea la cuenta de administrador del sistema'
                  : 'Completa los datos para registrar un nuevo usuario'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {regSuccess ? (
                <div className="text-center py-4 space-y-3">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500/20">
                    <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-green-300 font-medium">¡Usuario creado exitosamente!</p>
                  <p className="text-slate-400 text-sm">Iniciando sesión automáticamente...</p>
                </div>
              ) : (
                <form onSubmit={handleRegister} className="space-y-4">
                  {regError && (
                    <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-300">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{regError}</AlertDescription>
                    </Alert>
                  )}

                  {isFirstTime && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-amber-300 text-sm flex items-start gap-2">
                      <KeyRound className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>Este será el primer usuario del sistema y se creará como <strong>Administrador</strong>.</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="reg-name" className="text-slate-300">
                      Nombre completo
                    </Label>
                    <Input
                      id="reg-name"
                      placeholder="Juan Pérez"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      required
                      className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-email" className="text-slate-300">
                      Correo electrónico
                    </Label>
                    <Input
                      id="reg-email"
                      type="email"
                      placeholder="correo@ejemplo.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      required
                      className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-password" className="text-slate-300">
                      Contraseña
                    </Label>
                    <Input
                      id="reg-password"
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      required
                      className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-confirm-password" className="text-slate-300">
                      Confirmar contraseña
                    </Label>
                    <Input
                      id="reg-confirm-password"
                      type="password"
                      placeholder="Repetir contraseña"
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      required
                      className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20"
                    />
                  </div>

                  {!isFirstTime && (
                    <div className="space-y-2">
                      <Label htmlFor="reg-role" className="text-slate-300">
                        Rol
                      </Label>
                      <select
                        id="reg-role"
                        value={regRole}
                        onChange={(e) => setRegRole(e.target.value)}
                        className="w-full h-9 rounded-md border border-slate-600 bg-slate-900/50 px-3 text-white text-sm focus:border-blue-500 focus:ring-blue-500/20 focus:outline-none"
                      >
                        <option value="USER">Usuario</option>
                        <option value="SUPERVISOR">Supervisor</option>
                        <option value="ADMIN">Administrador</option>
                      </select>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-medium"
                    disabled={regLoading}
                  >
                    {regLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Creando usuario...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-2" />
                        {isFirstTime ? 'Crear Administrador' : 'Registrar Usuario'}
                      </>
                    )}
                  </Button>

                  <button
                    type="button"
                    onClick={() => setShowRegister(false)}
                    className="w-full text-center text-sm text-slate-400 hover:text-slate-300 transition-colors"
                  >
                    ← Volver al inicio de sesión
                  </button>
                </form>
              )}
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center mt-6 text-slate-500 text-xs">
          <p>Sistema de Planificación Operativa © {new Date().getFullYear()}</p>
          <p className="mt-1">Laguna Norte - Departamento de Mantención</p>
        </div>
      </div>
    </div>
  )
}
