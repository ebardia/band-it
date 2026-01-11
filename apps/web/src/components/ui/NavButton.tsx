interface NavButtonProps {
  children: React.ReactNode
  active?: boolean
  onClick?: () => void
}

export function NavButton({ children, active, onClick }: NavButtonProps) {
  const baseClasses = 'w-full text-left px-4 py-2 rounded-lg transition'
  const activeClasses = active 
    ? 'bg-blue-100 text-blue-600 font-semibold' 
    : 'text-gray-700 hover:bg-gray-100'
  
  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${activeClasses}`}
    >
      {children}
    </button>
  )
}