import { create } from 'zustand'
import { PromptTemplate, BoardTask, ChecklistItem } from '@vibe-coding-studio/shared'

interface AppStore {
  selectedVibe: string
  theme: 'dark' | 'light' | 'system'
  isDemoMode: boolean
  templates: PromptTemplate[]
  boardTasks: BoardTask[]
  checklist: ChecklistItem[]
  
  setSelectedVibe: (vibe: string) => void
  setTheme: (theme: 'dark' | 'light' | 'system') => void
  setIsDemoMode: (isDemoMode: boolean) => void
  
  addTemplate: (template: PromptTemplate) => void
  updateTemplate: (id: string, template: Partial<PromptTemplate>) => void
  deleteTemplate: (id: string) => void
  toggleFavorite: (id: string) => void
  
  addBoardTask: (task: BoardTask) => void
  updateBoardTask: (id: string, task: Partial<BoardTask>) => void
  moveBoardTask: (id: string, column: BoardTask['column']) => void
  deleteBoardTask: (id: string) => void
  
  toggleChecklistItem: (id: string) => void
}

const defaultChecklist: ChecklistItem[] = [
  {
    id: '1',
    category: 'Code Quality',
    title: 'TypeScript strict mode enabled',
    isComplete: false,
    order: 1,
  },
  {
    id: '2',
    category: 'Code Quality',
    title: 'ESLint with no warnings',
    isComplete: false,
    order: 2,
  },
  {
    id: '3',
    category: 'Testing',
    title: 'Unit tests with >80% coverage',
    isComplete: false,
    order: 3,
  },
  {
    id: '4',
    category: 'Testing',
    title: 'E2E tests for critical paths',
    isComplete: false,
    order: 4,
  },
  {
    id: '5',
    category: 'Security',
    title: 'No hardcoded secrets',
    isComplete: false,
    order: 5,
  },
  {
    id: '6',
    category: 'Security',
    title: 'Dependencies security audit',
    isComplete: false,
    order: 6,
  },
  {
    id: '7',
    category: 'Performance',
    title: 'Lighthouse score >90',
    isComplete: false,
    order: 7,
  },
  {
    id: '8',
    category: 'Accessibility',
    title: 'WCAG AA compliance',
    isComplete: false,
    order: 8,
  },
]

export const useStore = create<AppStore>((set) => ({
  selectedVibe: 'saas-neon',
  theme: 'dark',
  isDemoMode: true,
  templates: [],
  boardTasks: [],
  checklist: defaultChecklist,
  
  setSelectedVibe: (vibe) => set({ selectedVibe: vibe }),
  setTheme: (theme) => set({ theme }),
  setIsDemoMode: (isDemoMode) => set({ isDemoMode }),
  
  addTemplate: (template) => set((state) => ({ 
    templates: [...state.templates, template] 
  })),
  updateTemplate: (id, updates) => set((state) => ({
    templates: state.templates.map((t) => (t.id === id ? { ...t, ...updates } : t)),
  })),
  deleteTemplate: (id) => set((state) => ({
    templates: state.templates.filter((t) => t.id !== id),
  })),
  toggleFavorite: (id) => set((state) => ({
    templates: state.templates.map((t) =>
      t.id === id ? { ...t, isFavorite: !t.isFavorite } : t
    ),
  })),
  
  addBoardTask: (task) => set((state) => ({ 
    boardTasks: [...state.boardTasks, task] 
  })),
  updateBoardTask: (id, updates) => set((state) => ({
    boardTasks: state.boardTasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
  })),
  moveBoardTask: (id, column) => set((state) => ({
    boardTasks: state.boardTasks.map((t) => (t.id === id ? { ...t, column } : t)),
  })),
  deleteBoardTask: (id) => set((state) => ({
    boardTasks: state.boardTasks.filter((t) => t.id !== id),
  })),
  
  toggleChecklistItem: (id) => set((state) => ({
    checklist: state.checklist.map((item) =>
      item.id === id ? { ...item, isComplete: !item.isComplete } : item
    ),
  })),
}))
