import { create } from 'zustand'
import type { EnrichmentProgress } from '../types'

interface BatchState {
  activeBatchId: string | null
  setActiveBatchId: (id: string | null) => void
}

interface EnrichmentState {
  enrichmentProgress: EnrichmentProgress
  setEnrichmentProgress: (progress: Partial<EnrichmentProgress>) => void
  resetEnrichment: () => void
}

interface UIState {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
}

type AppStore = BatchState & EnrichmentState & UIState

const defaultEnrichment: EnrichmentProgress = {
  total: 0,
  current: 0,
  status: 'idle',
  result: null,
}

export const useAppStore = create<AppStore>((set) => ({
  // Batch
  activeBatchId: null,
  setActiveBatchId: (id) => set({ activeBatchId: id }),

  // Enrichment
  enrichmentProgress: defaultEnrichment,
  setEnrichmentProgress: (progress) =>
    set((state) => ({
      enrichmentProgress: { ...state.enrichmentProgress, ...progress },
    })),
  resetEnrichment: () => set({ enrichmentProgress: defaultEnrichment }),

  // UI
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}))
