'use client'

import { useState } from 'react'
import { useSession } from '@/lib/auth-context'
import { motion } from 'framer-motion'
import {
  UserCircle,
  Lock,
  Mail,
  Shield,
  Calendar,
  Loader2,
  Eye,
  EyeOff,
  Check,
  Key,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { apiFetch } from '@/lib/api'
import { toast } from 'sonner'

export function UserProfile() {
  const { data: session } = useSession()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [isChanging, setIsChanging] = useState(false)
  const [passwordChanged, setPasswordChanged] = useState(false)

  const user = session?.user
  const isAdmin = user?.role === 'ADMIN'

  const handleChangePassword = async () => {
    // Validations
    if (!currentPassword) {
      toast.error('Ingrese su contraseña actual')
      return
    }

    if (!newPassword) {
      toast.error('Ingrese la nueva contraseña')
      return
    }

    if (newPassword.length < 6) {
      toast.error('La nueva contraseña debe tener al menos 6 caracteres')
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden')
      return
    }

    if (currentPassword === newPassword) {
      toast.error('La nueva contraseña debe ser diferente a la actual')
      return
    }

    setIsChanging(true)
    try {
      const res = await apiFetch('/api/auth/change-password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al cambiar contraseña')
      }

      toast.success('Contraseña actualizada exitosamente')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordChanged(true)
      setTimeout(() => setPasswordChanged(false), 3000)
    } catch (err: any) {
      toast.error(err.message || 'Error al cambiar la contraseña')
    } finally {
      setIsChanging(false)
    }
  }

  // Password strength indicator
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { level: 0, label: '', color: '' }
    let strength = 0
    if (pwd.length >= 6) strength++
    if (pwd.length >= 8) strength++
    if (/[A-Z]/.test(pwd)) strength++
    if (/[0-9]/.test(pwd)) strength++
    if (/[^A-Za-z0-9]/.test(pwd)) strength++

    if (strength <= 1) return { level: 1, label: 'Débil', color: 'bg-red-500' }
    if (strength <= 2) return { level: 2, label: 'Regular', color: 'bg-amber-500' }
    if (strength <= 3) return { level: 3, label: 'Buena', color: 'bg-yellow-500' }
    if (strength <= 4) return { level: 4, label: 'Fuerte', color: 'bg-emerald-500' }
    return { level: 5, label: 'Muy fuerte', color: 'bg-emerald-600' }
  }

  const strength = getPasswordStrength(newPassword)

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <UserCircle className="h-5 w-5 text-emerald-600" />
          Mi Perfil
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Administre su información personal y configuración de seguridad
        </p>
      </div>

      {/* Profile Info Card */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Información Personal</CardTitle>
          <CardDescription>Sus datos de cuenta en el sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold shrink-0 ${
              isAdmin ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
            }`}>
              {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <p className="text-lg font-semibold">{user?.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      isAdmin
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    {isAdmin ? (
                      <><Shield className="h-3 w-3 mr-1" /> Administrador</>
                    ) : (
                      <><UserCircle className="h-3 w-3 mr-1" /> Usuario</>
                    )}
                  </Badge>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-medium">{user?.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Rol:</span>
                  <span className="font-medium">{isAdmin ? 'Administrador' : 'Usuario'}</span>
                </div>
              </div>

              {isAdmin && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
                  <p className="text-xs text-blue-700">
                    <strong>Permisos de Administrador:</strong> Puede aprobar/rechazar rendiciones, crear usuarios y gestionar el sistema completo.
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Change Password Card */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-50">
              <Key className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-base">Cambiar Contraseña</CardTitle>
              <CardDescription>Actualice su contraseña de acceso al sistema</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Password */}
          <div className="space-y-2">
            <Label htmlFor="current-password">Contraseña Actual</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="current-password"
                type={showCurrentPassword ? 'text' : 'password'}
                placeholder="Ingrese su contraseña actual"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="pl-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Separator />

          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="new-password">Nueva Contraseña</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="new-password"
                type={showNewPassword ? 'text' : 'password'}
                placeholder="Mínimo 6 caracteres"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pl-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {/* Password strength */}
            {newPassword && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div
                      key={level}
                      className={`h-1.5 flex-1 rounded-full transition-colors ${
                        level <= strength.level ? strength.color : 'bg-muted'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Fortaleza: <span className="font-medium">{strength.label}</span>
                </p>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirmar Nueva Contraseña</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirm-password"
                type="password"
                placeholder="Repita la nueva contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10 pr-10"
              />
              {confirmPassword && newPassword === confirmPassword && (
                <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600" />
              )}
            </div>
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-[10px] text-red-500">Las contraseñas no coinciden</p>
            )}
          </div>

          {/* Submit */}
          <div className="flex justify-end pt-2">
            <Button
              onClick={handleChangePassword}
              disabled={isChanging || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isChanging ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : passwordChanged ? (
                <Check className="mr-2 h-4 w-4" />
              ) : (
                <Lock className="mr-2 h-4 w-4" />
              )}
              {passwordChanged ? 'Contraseña Actualizada' : 'Cambiar Contraseña'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
