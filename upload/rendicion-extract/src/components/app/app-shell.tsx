'use client'

import { useState } from 'react'
import { useAuth, signOut } from '@/lib/auth-context'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  Bell,
  LogOut,
  Menu,
  Receipt,
  Shield,
  ChevronRight,
  Users,
  ShoppingCart,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { useAppStore } from '@/lib/store'
import { useQuery } from '@tanstack/react-query'

interface NavItem {
  id: string
  label: string
  icon: React.ReactNode
  view: string
}

interface SidebarContentProps {
  navItems: NavItem[]
  currentView: string
  onNavClick: (view: string) => void
  userName: string
  userEmail: string
  initials: string
  isAdmin: boolean
  unreadCount: number
}

function SidebarContent({
  navItems,
  currentView,
  onNavClick,
  userName,
  userEmail,
  initials,
  isAdmin,
  unreadCount,
}: SidebarContentProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4">
        <img src="/logo.jpg" alt="Laguna Norte" className="h-9 w-9 rounded-lg object-cover shadow-sm" />
        <div>
          <h2 className="font-bold text-sm">Laguna Norte</h2>
          <p className="text-[10px] text-muted-foreground">Rendición de Gastos</p>
        </div>
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = currentView === item.view
          return (
            <button
              key={item.id}
              onClick={() => onNavClick(item.view)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                transition-all duration-200 group
                ${isActive
                  ? 'bg-emerald-50 text-emerald-700 shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }
              `}
            >
              <span className={isActive ? 'text-emerald-600' : 'text-muted-foreground group-hover:text-foreground'}>
                {item.icon}
              </span>
              <span className="flex-1 text-left">{item.label}</span>
              {item.id === 'notifications' && unreadCount > 0 && (
                <Badge className="h-5 min-w-5 px-1.5 text-[10px] bg-red-500 text-white border-0">
                  {unreadCount}
                </Badge>
              )}
              {isActive && <ChevronRight className="h-3 w-3 text-emerald-500" />}
            </button>
          )
        })}
      </nav>

      <Separator />

      {/* User info */}
      <div className="p-3">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/50">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{userName}</p>
            <div className="flex items-center gap-1">
              <p className="text-[10px] text-muted-foreground truncate">{userEmail}</p>
            </div>
          </div>
          {isAdmin && (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-emerald-300 text-emerald-700 bg-emerald-50 shrink-0">
              <Shield className="h-2.5 w-2.5 mr-0.5" />
              ADMIN
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          className="w-full mt-2 justify-start text-muted-foreground hover:text-red-600 hover:bg-red-50 text-sm"
          onClick={() => signOut({ redirect: false })}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Cerrar Sesión
        </Button>
      </div>
    </div>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { session } = useAuth()
  const { currentView, setCurrentView } = useAppStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const isAdmin = session?.user?.role === 'ADMIN'

  // Fetch unread notification count
  const { data: notifData } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: async () => {
      const res = await fetch('/api/notifications?unreadOnly=true')
      if (!res.ok) throw new Error('Error')
      return res.json()
    },
    refetchInterval: 30000,
  })

  const unreadCount = notifData?.unreadCount || 0

  const userNavItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Mis Rendiciones',
      icon: <LayoutDashboard className="h-4 w-4" />,
      view: 'dashboard',
    },
    {
      id: 'create-report',
      label: 'Nueva Rendición',
      icon: <PlusCircle className="h-4 w-4" />,
      view: 'create-report',
    },
    {
      id: 'purchase-requests',
      label: 'Solicitudes de Compra',
      icon: <ShoppingCart className="h-4 w-4" />,
      view: 'purchase-requests',
    },
    {
      id: 'notifications',
      label: 'Notificaciones',
      icon: <Bell className="h-4 w-4" />,
      view: 'notifications',
    },
  ]

  const adminNavItems: NavItem[] = [
    {
      id: 'admin-dashboard',
      label: 'Panel Admin',
      icon: <LayoutDashboard className="h-4 w-4" />,
      view: 'admin-dashboard',
    },
    {
      id: 'all-reports',
      label: 'Rendiciones',
      icon: <FileText className="h-4 w-4" />,
      view: 'dashboard',
    },
    {
      id: 'create-report',
      label: 'Nueva Rendición',
      icon: <PlusCircle className="h-4 w-4" />,
      view: 'create-report',
    },
    {
      id: 'purchase-requests',
      label: 'Solicitudes de Compra',
      icon: <ShoppingCart className="h-4 w-4" />,
      view: 'purchase-requests',
    },
    {
      id: 'users-panel',
      label: 'Usuarios y Montos',
      icon: <Users className="h-4 w-4" />,
      view: 'users-panel',
    },
    {
      id: 'notifications',
      label: 'Notificaciones',
      icon: <Bell className="h-4 w-4" />,
      view: 'notifications',
    },
  ]

  const navItems = isAdmin ? adminNavItems : userNavItems

  const handleNavClick = (view: string) => {
    setCurrentView(view as any)
    setMobileMenuOpen(false)
  }

  const userName = session?.user?.name || 'Usuario'
  const userEmail = session?.user?.email || ''
  const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  const sidebarProps = {
    navItems,
    currentView,
    onNavClick: handleNavClick,
    userName,
    userEmail,
    initials,
    isAdmin,
    unreadCount,
  }

  return (
    <div className="min-h-screen flex bg-muted/30">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r bg-white shadow-sm">
        <SidebarContent {...sidebarProps} />
      </aside>

      {/* Main Content */}
      <div className="flex-1 lg:pl-64">
        {/* Top Bar (mobile + desktop) */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b px-4 lg:px-6 h-14 flex items-center justify-between">
          {/* Mobile menu */}
          <div className="flex items-center gap-3 lg:hidden">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SidebarContent {...sidebarProps} />
              </SheetContent>
            </Sheet>
            <div className="flex items-center gap-2">
              <img src="/logo.jpg" alt="Laguna Norte" className="h-7 w-7 rounded-md object-cover" />
              <span className="font-semibold text-sm">Laguna Norte</span>
            </div>
          </div>

          {/* Desktop title */}
          <div className="hidden lg:block">
            <h1 className="text-base font-semibold text-foreground">
              {navItems.find(i => i.view === currentView)?.label || 'Panel'}
            </h1>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="relative h-9 w-9"
              onClick={() => handleNavClick('notifications')}
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 text-[9px] font-bold bg-red-500 text-white rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </Button>
            <div className="hidden sm:flex items-center gap-2 ml-1">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-emerald-100 text-emerald-700 text-[10px] font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{userName}</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
