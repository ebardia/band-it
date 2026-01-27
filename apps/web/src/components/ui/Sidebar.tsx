import { theme } from '@band-it/shared'

interface SidebarProps {
  children?: React.ReactNode
}

export function Sidebar({ children }: SidebarProps) {
  return (
    <aside className="w-64 bg-white rounded-lg shadow p-4">
      {children}
    </aside>
  )
}