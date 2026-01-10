import { cn } from '@band-it/shared'

interface HeadingProps {
  children: React.ReactNode
  level?: 1 | 2 | 3
  className?: string
}

export function Heading({ children, level = 1, className }: HeadingProps) {
  const sizes = {
    1: 'text-3xl font-bold text-gray-900',
    2: 'text-2xl font-bold text-gray-900',
    3: 'text-xl font-bold text-gray-900',
  }
  
  const Tag = `h${level}` as keyof JSX.IntrinsicElements
  
  return <Tag className={cn(sizes[level], className)}>{children}</Tag>
}

interface TextProps {
  children: React.ReactNode
  variant?: 'body' | 'small' | 'muted'
  className?: string
}

export function Text({ children, variant = 'body', className }: TextProps) {
  const variants = {
    body: 'text-base text-gray-900',
    small: 'text-sm text-gray-600',
    muted: 'text-gray-600',
  }
  
  return <p className={cn(variants[variant], className)}>{children}</p>
}