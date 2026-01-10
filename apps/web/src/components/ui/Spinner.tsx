import { cn } from '@band-it/shared'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-16 w-16 border-b-2',
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <div
      className={cn(
        'animate-spin rounded-full border-blue-600',
        sizes[size],
        className
      )}
    />
  )
}

interface LoadingProps {
  message?: string
}

export function Loading({ message = 'Loading...' }: LoadingProps) {
  return (
    <div className="text-center">
      <div className="mb-6 flex justify-center">
        <Spinner size="lg" />
      </div>
      <p className="text-gray-600">{message}</p>
    </div>
  )
}