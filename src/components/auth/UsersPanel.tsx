'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  Users,
  UserPlus,
  Pencil,
  Trash2,
  Shield,
  ShieldCheck,
  User,
  ToggleLeft,
  ToggleRight,
  Search,
  RefreshCw,
} from 'lucide-react'

interface UserItem {
  id: string
  email: string
  name: string
  role: string
  active: boolean
  avatar?: string | null
  createdAt: string
  updatedAt: string
}

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  ADMIN: { label: 'Administrador', color: 'bg-red-500/20 text-red-300 border-red-500/30', icon: <Shield className="w-3 h-3" /> },
  SUPERVISOR: { label: 'Supervisor', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30', icon: <ShieldCheck className="w-3 h-3" /> },
  USER: { label: 'Usuario', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30', icon: <User className="w-3 h-3" /> },
}

export default function UsersPanel() {
  const { session } = useAuth()
  const { toast } = useToast()
  const [users, setUsers] = useState<UserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Dialog de crear/editar
  const [showDialog, setShowDialog] = useState(false)
  const [editingUser, setEditingUser] = useState<UserItem | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'USER',
  })
  const [saving, setSaving] = useState(false)

  // Dialog de confirmación de eliminación
  const [deleteUser, setDeleteUser] = useState<UserItem | null>(null)

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/users', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setUsers(data)
      }
    } catch (error) {
      console.error('Error cargando usuarios:', error)
      toast({ title: 'Error', description: 'No se pudieron cargar los usuarios', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const openCreateDialog = () => {
    setEditingUser(null)
    setFormData({ name: '', email: '', password: '', role: 'USER' })
    setShowDialog(true)
  }

  const openEditDialog = (user: UserItem) => {
    setEditingUser(user)
    setFormData({ name: user.name, email: user.email, password: '', role: user.role })
    setShowDialog(true)
  }

  const handleSave = async () => {
    if (!formData.name || !formData.email) {
      toast({ title: 'Error', description: 'Nombre y email son requeridos', variant: 'destructive' })
      return
    }

    if (!editingUser && !formData.password) {
      toast({ title: 'Error', description: 'La contraseña es requerida para nuevos usuarios', variant: 'destructive' })
      return
    }

    if (formData.password && formData.password.length < 6) {
      toast({ title: 'Error', description: 'La contraseña debe tener al menos 6 caracteres', variant: 'destructive' })
      return
    }

    setSaving(true)

    try {
      if (editingUser) {
        // Actualizar usuario existente
        const updateData: any = {
          id: editingUser.id,
          name: formData.name,
          email: formData.email,
          role: formData.role,
        }
        if (formData.password) {
          updateData.password = formData.password
        }

        const res = await fetch('/api/users', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
          credentials: 'include',
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Error al actualizar')
        }

        toast({ title: 'Usuario actualizado', description: `${formData.name} ha sido actualizado` })
      } else {
        // Crear nuevo usuario
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
          credentials: 'include',
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Error al crear usuario')
        }

        toast({ title: 'Usuario creado', description: `${formData.name} ha sido registrado` })
      }

      setShowDialog(false)
      fetchUsers()
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (user: UserItem) => {
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, active: !user.active }),
        credentials: 'include',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al actualizar')
      }

      toast({
        title: user.active ? 'Usuario desactivado' : 'Usuario activado',
        description: `${user.name} ha sido ${user.active ? 'desactivado' : 'activado'}`,
      })
      fetchUsers()
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    }
  }

  const handleDelete = async () => {
    if (!deleteUser) return

    try {
      const res = await fetch(`/api/users?id=${deleteUser.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al eliminar')
      }

      toast({ title: 'Usuario eliminado', description: `${deleteUser.name} ha sido eliminado` })
      setDeleteUser(null)
      fetchUsers()
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    }
  }

  const isAdmin = session?.user?.role === 'ADMIN'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            Gestión de Usuarios
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Administra los usuarios y sus roles en el sistema
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchUsers}
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Actualizar
          </Button>
          {isAdmin && (
            <Button
              size="sm"
              onClick={openCreateDialog}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <UserPlus className="w-4 h-4 mr-1" />
              Nuevo Usuario
            </Button>
          )}
        </div>
      </div>

      {/* Búsqueda */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Buscar por nombre o email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
        />
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-red-400">{users.filter((u) => u.role === 'ADMIN').length}</p>
            <p className="text-xs text-slate-400">Administradores</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-amber-400">{users.filter((u) => u.role === 'SUPERVISOR').length}</p>
            <p className="text-xs text-slate-400">Supervisores</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-blue-400">{users.filter((u) => u.role === 'USER').length}</p>
            <p className="text-xs text-slate-400">Usuarios</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de usuarios */}
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No se encontraron usuarios</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-transparent">
                    <TableHead className="text-slate-300">Nombre</TableHead>
                    <TableHead className="text-slate-300">Email</TableHead>
                    <TableHead className="text-slate-300">Rol</TableHead>
                    <TableHead className="text-slate-300">Estado</TableHead>
                    <TableHead className="text-slate-300">Creado</TableHead>
                    {isAdmin && (
                      <TableHead className="text-slate-300 text-right">Acciones</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => {
                    const roleConfig = ROLE_CONFIG[user.role] || ROLE_CONFIG.USER
                    return (
                      <TableRow key={user.id} className="border-slate-700 hover:bg-slate-700/30">
                        <TableCell className="text-white font-medium">{user.name}</TableCell>
                        <TableCell className="text-slate-300">{user.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`${roleConfig.color} text-xs`}>
                            {roleConfig.icon}
                            <span className="ml-1">{roleConfig.label}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              user.active
                                ? 'bg-green-500/20 text-green-300 border-green-500/30 text-xs'
                                : 'bg-gray-500/20 text-gray-300 border-gray-500/30 text-xs'
                            }
                          >
                            {user.active ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-400 text-sm">
                          {new Date(user.createdAt).toLocaleDateString('es-CL')}
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleActive(user)}
                                className="text-slate-400 hover:text-white hover:bg-slate-700"
                                title={user.active ? 'Desactivar' : 'Activar'}
                              >
                                {user.active ? (
                                  <ToggleRight className="w-4 h-4 text-green-400" />
                                ) : (
                                  <ToggleLeft className="w-4 h-4 text-gray-400" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditDialog(user)}
                                className="text-slate-400 hover:text-blue-400 hover:bg-slate-700"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              {user.id !== session?.user?.id && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeleteUser(user)}
                                  className="text-slate-400 hover:text-red-400 hover:bg-slate-700"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Crear/Editar Usuario */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {editingUser
                ? 'Modifica los datos del usuario. Deja la contraseña vacía para no cambiarla.'
                : 'Completa los datos para registrar un nuevo usuario.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Nombre completo</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Juan Pérez"
                className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Correo electrónico</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="correo@ejemplo.com"
                className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">
                Contraseña {editingUser && '(dejar vacío para no cambiar)'}
              </Label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={editingUser ? '••••••••' : 'Mínimo 6 caracteres'}
                className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Rol</Label>
              <Select value={formData.role} onValueChange={(val) => setFormData({ ...formData, role: val })}>
                <SelectTrigger className="bg-slate-900/50 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="USER">
                    <div className="flex items-center gap-2">
                      <User className="w-3 h-3 text-blue-400" />
                      Usuario - Acceso básico al sistema
                    </div>
                  </SelectItem>
                  <SelectItem value="SUPERVISOR">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-3 h-3 text-amber-400" />
                      Supervisor - Puede crear y aprobar solicitudes
                    </div>
                  </SelectItem>
                  <SelectItem value="ADMIN">
                    <div className="flex items-center gap-2">
                      <Shield className="w-3 h-3 text-red-400" />
                      Administrador - Control total del sistema
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Guardando...
                </>
              ) : (
                editingUser ? 'Guardar Cambios' : 'Crear Usuario'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmar Eliminación */}
      <AlertDialog open={!!deleteUser} onOpenChange={() => setDeleteUser(null)}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">¿Eliminar usuario?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Esta acción no se puede deshacer. El usuario <strong className="text-white">{deleteUser?.name}</strong> será eliminado permanentemente del sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-600 text-slate-300 hover:bg-slate-700">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
