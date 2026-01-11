interface RightSidebarProps {
  children: React.ReactNode
}

export function RightSidebar({ children }: RightSidebarProps) {
  return (
    <aside className="w-96 bg-white rounded-lg shadow p-4">
      {children}
    </aside>
  )
}