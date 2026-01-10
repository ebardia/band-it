import { cn } from '@band-it/shared'

interface ListProps {
  children: React.ReactNode
  ordered?: boolean
  className?: string
}

export function List({ children, ordered = false, className }: ListProps) {
  const Tag = ordered ? 'ol' : 'ul'
  const listStyle = ordered ? 'list-decimal' : 'list-disc'
  
  return (
    <Tag className={cn('text-sm text-gray-700 space-y-1 list-inside', listStyle, className)}>
      {children}
    </Tag>
  )
}

export function ListItem({ children }: { children: React.ReactNode }) {
  return <li>{children}</li>
}