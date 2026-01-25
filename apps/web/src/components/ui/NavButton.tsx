export interface NavButtonProps {
  children: React.ReactNode
  active?: boolean
  onClick?: () => void
  className?: string
  disabled?: boolean
}

export function NavButton({ children, active, onClick, className, disabled }: NavButtonProps) {
  const baseClasses = 'w-full text-left px-4 py-2 rounded-lg transition'
  const activeClasses = active
    ? 'bg-blue-100 text-blue-600 font-semibold'
    : 'text-gray-700 hover:bg-gray-100'
  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : ''

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${activeClasses} ${disabledClasses} ${className || ''}`}
    >
      {children}
    </button>
  )
}