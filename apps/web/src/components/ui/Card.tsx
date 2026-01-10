import { theme, cn } from '@band-it/shared'

interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
}

export function Card({ children, className, hover }: CardProps) {
  return (
    <div
      className={cn(
        theme.components.card.base,
        hover && theme.components.card.hover,
        className
      )}
    >
      {children}
    </div>
  )
}