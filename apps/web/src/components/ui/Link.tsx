import NextLink from 'next/link'
import { cn } from '@band-it/shared'

interface LinkProps {
  href: string
  children: React.ReactNode
  variant?: 'primary' | 'muted'
  size?: 'sm' | 'md'
  className?: string
}

const variants = {
  primary: 'text-blue-600 hover:text-blue-700 font-semibold',
  muted: 'text-gray-600 hover:text-gray-700',
}

const sizes = {
  sm: 'text-sm',
  md: 'text-base',
}

export function Link({ href, children, variant = 'primary', size = 'md', className }: LinkProps) {
  return (
    <NextLink href={href} className={cn(variants[variant], sizes[size], className)}>
      {children}
    </NextLink>
  )
}