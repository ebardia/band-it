export interface NavButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  active?: boolean
}

export function NavButton({ children, active, className, disabled, ...props }: NavButtonProps) {
  const baseClasses = 'w-full text-left px-4 py-2 rounded-lg transition'
  const activeClasses = active
    ? 'bg-blue-100 text-blue-600 font-semibold'
    : 'text-gray-700 hover:bg-gray-100'
  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : ''

  return (
    <button
      disabled={disabled}
      className={`${baseClasses} ${activeClasses} ${disabledClasses} ${className || ''}`}
      {...props}
    >
      {children}
    </button>
  )
}