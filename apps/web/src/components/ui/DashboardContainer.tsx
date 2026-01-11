interface DashboardContainerProps {
  children: React.ReactNode
}

export function DashboardContainer({ children }: DashboardContainerProps) {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {children}
    </div>
  )
}