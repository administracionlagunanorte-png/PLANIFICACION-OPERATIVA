import { create } from 'zustand'

type View = 'login' | 'dashboard' | 'create-report' | 'edit-report' | 'report-detail' | 'admin-dashboard' | 'notifications' | 'users-panel' | 'purchase-requests' | 'purchase-request-detail' | 'create-purchase-request' | 'edit-purchase-request'

interface AppState {
  currentView: View
  setCurrentView: (view: View) => void
  selectedReportId: string | null
  setSelectedReportId: (id: string | null) => void
  selectedPurchaseRequestId: string | null
  setSelectedPurchaseRequestId: (id: string | null) => void
  filters: {
    status: string
    userId: string
    category: string
    dateFrom: string
    dateTo: string
  }
  setFilters: (filters: Partial<AppState['filters']>) => void
  resetFilters: () => void
}

const defaultFilters = {
  status: '',
  userId: '',
  category: '',
  dateFrom: '',
  dateTo: ''
}

export const useAppStore = create<AppState>((set) => ({
  currentView: 'login',
  setCurrentView: (view) => set({ currentView: view }),
  selectedReportId: null,
  setSelectedReportId: (id) => set({ selectedReportId: id }),
  selectedPurchaseRequestId: null,
  setSelectedPurchaseRequestId: (id) => set({ selectedPurchaseRequestId: id }),
  filters: { ...defaultFilters },
  setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),
  resetFilters: () => set({ filters: { ...defaultFilters } })
}))
