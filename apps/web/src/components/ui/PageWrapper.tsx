interface PageWrapperProps {
  children: React.ReactNode
  variant?: 'default' | 'dashboard' | 'paper'
}

export function PageWrapper({ children, variant = 'default' }: PageWrapperProps) {
  const bgClass =
    variant === 'dashboard' ? 'bg-gray-50' : variant === 'paper' ? 'bg-white' : 'bg-white'

  return (
    <div className={`min-h-screen ${bgClass}`}>
      {children}
    </div>
  )
}