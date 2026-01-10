import { cn } from '@band-it/shared'

interface ContainerProps {
  children: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'full'
}

const sizes = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  full: 'max-w-full',
}

export function Container({ children, className, size = 'md' }: ContainerProps) {
  return (
    <div className={cn('w-full', sizes[size], className)}>
      {children}
    </div>
  )
}