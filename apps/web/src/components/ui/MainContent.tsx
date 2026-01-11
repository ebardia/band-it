interface MainContentProps {
  children: React.ReactNode
}

export function MainContent({ children }: MainContentProps) {
  return (
    <main className="flex-1 bg-white rounded-lg shadow p-8">
      {children}
    </main>
  )
}