import { cn } from '@band-it/shared'

interface BoxProps {
  children: React.ReactNode
  align?: 'left' | 'center' | 'right'
  className?: string
}

const alignClasses = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
}

export function Box({ children, align = 'left', className }: BoxProps) {
  return (
    <div className={cn(align && alignClasses[align], className)}>
      {children}
    </div>
  )
}