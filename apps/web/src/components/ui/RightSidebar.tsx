interface RightSidebarProps {
  children?: React.ReactNode
}

export function RightSidebar({ children }: RightSidebarProps) {
  return (
    <aside className="w-[450px] bg-white rounded-lg shadow p-4">
      {children}
    </aside>
  )
}