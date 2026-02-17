import { theme, cn } from '@band-it/shared'

export interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  onClick?: () => void
  style?: React.CSSProperties
}

// Fallback styles in case theme isn't loaded properly
const FALLBACK_BASE = 'bg-white rounded-2xl shadow-xl p-8'
const FALLBACK_HOVER = 'hover:shadow-2xl transition'

export function Card({ children, className, hover, onClick, style }: CardProps) {
  const baseStyle = theme?.components?.card?.base ?? FALLBACK_BASE
  const hoverStyle = theme?.components?.card?.hover ?? FALLBACK_HOVER

  return (
    <div
      className={cn(
        baseStyle,
        hover && hoverStyle,
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
      style={style}
    >
      {children}
    </div>
  )
}