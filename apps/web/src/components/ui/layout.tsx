import { cn } from '@band-it/shared'

interface StackProps {
  children: React.ReactNode
  spacing?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const stackSpacing = {
  sm: 'space-y-2',
  md: 'space-y-4',
  lg: 'space-y-6',
  xl: 'space-y-8',
}

export function Stack({ children, spacing = 'md', className }: StackProps) {
  return (
    <div className={cn(stackSpacing[spacing], className)}>
      {children}
    </div>
  )
}

interface CenterProps {
  children: React.ReactNode
  className?: string
}

export function Center({ children, className }: CenterProps) {
  return (
    <div className={cn('text-center', className)}>
      {children}
    </div>
  )
}

interface FlexProps {
  children: React.ReactNode
  justify?: 'start' | 'end' | 'center' | 'between'
  align?: 'start' | 'end' | 'center'
  gap?: 'sm' | 'md' | 'lg'
  className?: string
}

const justifyClasses = {
  start: 'justify-start',
  end: 'justify-end',
  center: 'justify-center',
  between: 'justify-between',
}

const alignClasses = {
  start: 'items-start',
  end: 'items-end',
  center: 'items-center',
}

const gapClasses = {
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
}

export function Flex({ children, justify = 'start', align = 'center', gap = 'md', className }: FlexProps) {
  return (
    <div className={cn('flex', justifyClasses[justify], alignClasses[align], gapClasses[gap], className)}>
      {children}
    </div>
  )
}

interface SpacerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const spacerSizes = {
  sm: 'h-2',
  md: 'h-4',
  lg: 'h-6',
  xl: 'h-8',
}

export function Spacer({ size = 'md' }: SpacerProps) {
  return <div className={spacerSizes[size]} />
}