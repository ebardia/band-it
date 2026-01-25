import { cn } from '@band-it/shared'

export interface StackProps {
  children: React.ReactNode
  spacing?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  align?: 'start' | 'center' | 'end' | 'stretch'
  className?: string
}

const stackSpacing = {
  xs: 'space-y-1',
  sm: 'space-y-2',
  md: 'space-y-4',
  lg: 'space-y-6',
  xl: 'space-y-8',
}

const stackAlign = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
}

export function Stack({ children, spacing = 'md', align, className }: StackProps) {
  return (
    <div className={cn('flex flex-col', stackSpacing[spacing], align && stackAlign[align], className)}>
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

export interface FlexProps {
  children: React.ReactNode
  justify?: 'start' | 'end' | 'center' | 'between'
  align?: 'start' | 'end' | 'center' | 'baseline'
  gap?: 'xs' | 'sm' | 'md' | 'lg'
  wrap?: boolean | 'wrap' | 'nowrap' | 'wrap-reverse'
  className?: string
  onClick?: () => void
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
  baseline: 'items-baseline',
}

const gapClasses = {
  xs: 'gap-1',
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
}

const wrapClasses = {
  wrap: 'flex-wrap',
  nowrap: 'flex-nowrap',
  'wrap-reverse': 'flex-wrap-reverse',
}

export function Flex({ children, justify = 'start', align = 'center', gap = 'md', wrap, className, onClick }: FlexProps) {
  const wrapClass = wrap === true ? 'flex-wrap' : (wrap ? wrapClasses[wrap] : '')
  return (
    <div
      className={cn('flex', justifyClasses[justify], alignClasses[align], gapClasses[gap], wrapClass, onClick && 'cursor-pointer', className)}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

interface SpacerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}

const spacerSizes = {
  xs: 'h-1',
  sm: 'h-2',
  md: 'h-4',
  lg: 'h-6',
  xl: 'h-8',
}

export function Spacer({ size = 'md' }: SpacerProps) {
  return <div className={spacerSizes[size]} />
}