import { useStore } from '../../lib/store'
import { Badge } from '../ui/badge'

export function Topbar() {
  const { isDemoMode } = useStore()
  
  return (
    <header className="h-16 border-b border-[var(--border)] bg-[var(--card-bg)] flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold">Workspace</h2>
        {isDemoMode && (
          <Badge variant="accent">Demo Mode</Badge>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-400">Ready to build</span>
      </div>
    </header>
  )
}
