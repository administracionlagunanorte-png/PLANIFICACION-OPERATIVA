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
  ADMIN: { label: 'Administrador', color: 'bg-red-100 text-red-800 border-red-200', icon: <Shield className="w-3 h-3" /> },
  SUPERVISOR: { label: 'Supervisor', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: <ShieldCheck className="w-3 h-3" /> },
  USER: { label: 'Usuario', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: <User className="w-3 h-3" /> },
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
      toast({ title: 'Error', description: 'La contrasena es requerida para nuevos usuarios', variant: 'destructive' })
      return
    }

    if (formData.password && formData.password.length < 6) {
      toast({ title: 'Error', description: 'La contrasena debe tener al menos 6 caracteres', variant: 'destructive' })
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
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Gestion de Usuarios
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Administra los usuarios y sus roles en el sistema
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchUsers}
            className="border-slate-300 text-slate-700 hover:bg-slate-50"
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
          className="pl-9 bg-white border-slate-300 text-slate-800 placeholder:text-slate-400"
        />
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-white border-slate-200">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{users.filter((u) => u.role === 'ADMIN').length}</p>
            <p className="text-xs text-slate-600 font-medium mt-1">Administradores</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{users.filter((u) => u.role === 'SUPERVISOR').length}</p>
            <p className="text-xs text-slate-600 font-medium mt-1">Supervisores</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{users.filter((u) => u.role === 'USER').length}</p>
            <p className="text-xs text-slate-600 font-medium mt-1">Usuarios</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de usuarios */}
      <Card className="bg-white border-slate-200">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="font-medium text-slate-600">No se encontraron usuarios</p>
              <p className="text-sm text-slate-400 mt-1">Intenta con otro termino de busqueda</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-200 hover:bg-transparent bg-slate-50">
                    <TableHead className="text-slate-700 font-semibold">Nombre</TableHead>
                    <TableHead className="text-slate-700 font-semibold">Email</TableHead>
                    <TableHead className="text-slate-700 font-semibold">Rol</TableHead>
                    <TableHead className="text-slate-700 font-semibold">Estado</TableHead>
                    <TableHead className="text-slate-700 font-semibold">Creado</TableHead>
                    {isAdmin && (
                      <TableHead className="text-slate-700 font-semibold text-right">Acciones</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => {
                    const roleConfig = ROLE_CONFIG[user.role] || ROLE_CONFIG.USER
                    return (
                      <TableRow key={user.id} className="border-slate-100 hover:bg-slate-50">
                        <TableCell className="text-slate-800 font-medium">{user.name}</TableCell>
                        <TableCell className="text-slate-600">{user.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`${roleConfig.color} text-xs font-medium`}>
                            <span className="flex items-center gap-1">
                              {roleConfig.icon}
                              {roleConfig.label}
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              user.active
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200 text-xs font-medium'
                                : 'bg-slate-100 text-slate-600 border-slate-200 text-xs font-medium'
                            }
                          >
                            {user.active ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-500 text-sm">
                          {new Date(user.createdAt).toLocaleDateString('es-CL')}
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleActive(user)}
                                className="text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                                title={user.active ? 'Desactivar' : 'Activar'}
                              >
                                {user.active ? (
                                  <ToggleRight className="w-4 h-4 text-emerald-600" />
                                ) : (
                                  <ToggleLeft className="w-4 h-4 text-slate-400" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditDialog(user)}
                                className="text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              {user.id !== session?.user?.id && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeleteUser(user)}
                                  className="text-slate-500 hover:text-red-600 hover:bg-red-50"
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
        <DialogContent className="bg-white border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-slate-800">
              {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              {editingUser
                ? 'Modifica los datos del usuario. Deja la contrasena vacia para no cambiarla.'
                : 'Completa los datos para registrar un nuevo usuario.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-slate-700 font-medium">Nombre completo</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Juan Perez"
                className="bg-white border-slate-300 text-slate-800 placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700 font-medium">Correo electronico</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="correo@ejemplo.com"
                className="bg-white border-slate-300 text-slate-800 placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700 font-medium">
                Contrasena {editingUser && '(dejar vacio para no cambiar)'}
              </Label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={editingUser ? '--------' : 'Minimo 6 caracteres'}
                className="bg-white border-slate-300 text-slate-800 placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700 font-medium">Rol</Label>
              <Select value={formData.role} onValueChange={(val) => setFormData({ ...formData, role: val })}>
                <SelectTrigger className="bg-white border-slate-300 text-slate-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  <SelectItem value="USER">
                    <div className="flex items-center gap-2">
                      <User className="w-3 h-3 text-blue-600" />
                      <span className="text-slate-700">Usuario - Acceso basico al sistema</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="SUPERVISOR">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-3 h-3 text-amber-600" />
                      <span className="text-slate-700">Supervisor - Puede crear y aprobar solicitudes</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="ADMIN">
                    <div className="flex items-center gap-2">
                      <Shield className="w-3 h-3 text-red-600" />
                      <span className="text-slate-700">Administrador - Control total del sistema</span>
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
              className="border-slate-300 text-slate-700"
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
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-800">Eliminar usuario?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600">
              Esta accion no se puede deshacer. El usuario <strong className="text-slate-800">{deleteUser?.name}</strong> sera eliminado permanentemente del sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-300 text-slate-700">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
