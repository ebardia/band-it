import { cn } from '@band-it/shared'

interface IconCircleProps {
  children: React.ReactNode
  variant?: 'primary' | 'success' | 'danger' | 'warning'
  size?: 'sm' | 'md' | 'lg'
}

const variantClasses = {
  primary: 'bg-blue-100 text-blue-600',
  success: 'bg-green-500 text-white',
  danger: 'bg-red-100 text-red-600',
  warning: 'bg-yellow-100 text-yellow-600',
}

const sizeClasses = {
  sm: 'w-12 h-12',
  md: 'w-16 h-16',
  lg: 'w-20 h-20',
}

export function IconCircle({ children, variant = 'primary', size = 'md' }: IconCircleProps) {
  return (
    <div className={cn('rounded-full flex items-center justify-center mx-auto', variantClasses[variant], sizeClasses[size])}>
      {children}
    </div>
  )
}

export function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={cn('w-10 h-10', className)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
    </svg>
  )
}

export function EmailIcon({ className }: { className?: string }) {
  return (
    <svg className={cn('w-10 h-10', className)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  )
}