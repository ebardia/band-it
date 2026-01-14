interface DashboardContainerProps {
  children: React.ReactNode
  wide?: boolean
}

export function DashboardContainer({ children, wide = false }: DashboardContainerProps) {
  return (
    <div className={`mx-auto px-4 py-8 ${wide ? 'max-w-[1600px]' : 'max-w-7xl'}`}>
      {children}
    </div>
  )
}