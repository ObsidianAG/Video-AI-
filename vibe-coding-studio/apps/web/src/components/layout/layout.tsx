import { Outlet } from '@tanstack/react-router'
import { Sidebar } from './sidebar'
import { Topbar } from './topbar'

export function Layout() {
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Topbar />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
