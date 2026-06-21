'use client'

import { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { AuthProvider, useAuth } from '@/lib/auth-context'
import { useAppStore } from '@/lib/store'
import { LoginForm } from '@/components/app/login-form'
import { AppShell } from '@/components/app/app-shell'
import { AdminDashboard } from '@/components/app/admin-dashboard'
import { ReportForm } from '@/components/app/report-form'
import { ReportDetail } from '@/components/app/report-detail'
import { ReportsList } from '@/components/app/reports-list'
import { NotificationsPanel } from '@/components/app/notifications-panel'
import { UsersPanel } from '@/components/app/users-panel'
import { PurchaseRequestsList } from '@/components/app/purchase-requests-list'
import { PurchaseRequestForm } from '@/components/app/purchase-request-form'
import { PurchaseRequestDetail } from '@/components/app/purchase-request-detail'
import { Loader2 } from 'lucide-react'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: 1,
    },
  },
})

function AppContent() {
  const { session, status } = useAuth()
  const { currentView, setCurrentView } = useAppStore()

  // When session becomes authenticated, navigate to the correct dashboard
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      const role = session.user.role
      if (currentView === 'login') {
        setCurrentView(role === 'ADMIN' ? 'admin-dashboard' : 'dashboard')
      }
    }
  }, [status, session, currentView, setCurrentView])

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-emerald-50/50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  // Not authenticated - show login only
  if (status === 'unauthenticated') {
    return <LoginForm />
  }

  // Authenticated - render appropriate view
  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <ReportsList />
      case 'admin-dashboard':
        return <AdminDashboard />
      case 'create-report':
        return <ReportForm />
      case 'edit-report':
        return <ReportForm />
      case 'report-detail':
        return <ReportDetail />
      case 'notifications':
        return <NotificationsPanel />
      case 'users-panel':
        return <UsersPanel />
      case 'purchase-requests':
        return <PurchaseRequestsList />
      case 'create-purchase-request':
        return <PurchaseRequestForm mode="create" />
      case 'edit-purchase-request':
        return <PurchaseRequestForm mode="edit" />
      case 'purchase-request-detail':
        return <PurchaseRequestDetail />
      default:
        return <ReportsList />
    }
  }

  return (
    <AppShell>
      {renderView()}
    </AppShell>
  )
}

export default function Home() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <AppContent />
        <Toaster position="top-right" richColors closeButton />
      </QueryClientProvider>
    </AuthProvider>
  )
}
