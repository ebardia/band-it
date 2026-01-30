import Link from 'next/link'

export interface NavButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'href'> {
  children: React.ReactNode
  active?: boolean
  href?: string
}

export function NavButton({ children, active, className, disabled, href, onClick, ...props }: NavButtonProps) {
  const baseClasses = 'w-full text-left px-4 py-2 rounded-lg transition block'
  const activeClasses = active
    ? 'bg-blue-100 text-blue-600 font-semibold'
    : 'text-gray-700 hover:bg-gray-100'
  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : ''
  const combinedClasses = `${baseClasses} ${activeClasses} ${disabledClasses} ${className || ''}`

  // Render as Link if href is provided
  if (href && !disabled) {
    return (
      <Link
        href={href}
        className={combinedClasses}
        scroll={false}
        {...(props as any)}
      >
        {children}
      </Link>
    )
  }

  return (
    <button
      disabled={disabled}
      className={combinedClasses}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  )
}
