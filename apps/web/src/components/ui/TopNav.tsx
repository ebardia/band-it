interface TopNavProps {
  children: React.ReactNode
}

export function TopNav({ children }: TopNavProps) {
  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 py-4">
        {children}
      </div>
    </nav>
  )
}