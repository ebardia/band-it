import { cn } from '@band-it/shared'

interface HeadingProps {
  children: React.ReactNode
  level?: 1 | 2 | 3 | 4
  className?: string
}

export function Heading({ children, level = 1, className }: HeadingProps) {
  const sizes = {
    1: 'text-3xl font-bold text-gray-900',
    2: 'text-2xl font-bold text-gray-900',
    3: 'text-xl font-bold text-gray-900',
    4: 'text-lg font-semibold text-gray-900',
  }
  
  const Tag = `h${level}` as keyof JSX.IntrinsicElements
  
  return <Tag className={cn(sizes[level], className)}>{children}</Tag>
}

export interface TextProps {
  children: React.ReactNode
  variant?: 'body' | 'small' | 'tiny' | 'muted'
  weight?: 'normal' | 'semibold' | 'bold'
  color?: 'default' | 'muted' | 'primary' | 'success' | 'warning' | 'danger'
  className?: string
  style?: React.CSSProperties
  as?: 'p' | 'span' | 'label' | 'div'
  htmlFor?: string
  title?: string
}

export function Text({ children, variant = 'body', weight = 'normal', color = 'default', className, style, as = 'p', htmlFor, title }: TextProps) {
  const variants = {
    body: 'text-base',
    small: 'text-sm',
    tiny: 'text-xs',
    muted: 'text-gray-600',
  }

  const weights = {
    normal: 'font-normal',
    semibold: 'font-semibold',
    bold: 'font-bold',
  }

  const colors = {
    default: 'text-gray-900',
    muted: 'text-gray-600',
    primary: 'text-blue-600',
    success: 'text-green-800',
    warning: 'text-yellow-800',
    danger: 'text-red-800',
  }

  const Tag = as as keyof JSX.IntrinsicElements
  const props: any = {
    className: cn(variants[variant], weights[weight], colors[color], className),
    style,
    title,
  }
  if (htmlFor && as === 'label') {
    props.htmlFor = htmlFor
  }

  return <Tag {...props}>{children}</Tag>
}