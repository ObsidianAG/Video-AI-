import { Link } from '@tanstack/react-router'
import { 
  Home, 
  Sparkles, 
  FileText, 
  Palette, 
  Kanban, 
  CheckSquare, 
  Settings 
} from 'lucide-react'

const navigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Studio', href: '/studio', icon: Sparkles },
  { name: 'Prompts', href: '/prompts', icon: FileText },
  { name: 'Vibes', href: '/vibes', icon: Palette },
  { name: 'Board', href: '/board', icon: Kanban },
  { name: 'Checklist', href: '/checklist', icon: CheckSquare },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function Sidebar() {
  return (
    <aside className="w-64 bg-[var(--card-bg)] border-r border-[var(--border)] flex flex-col">
      <div className="p-6 border-b border-[var(--border)]">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] bg-clip-text text-transparent">
          Vibe Studio
        </h1>
      </div>
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navigation.map(item => (
            <li key={item.name}>
              <Link
                to={item.href}
                className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-[rgba(255,255,255,0.05)] transition-colors"
                activeProps={{
                  className: 'bg-[var(--primary)] text-white',
                }}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}
