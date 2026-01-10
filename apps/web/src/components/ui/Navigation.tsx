import Link from 'next/link'
import { theme, cn } from '@band-it/shared'

interface NavLinkProps {
  href: string
  children: React.ReactNode
  active?: boolean
}

export function NavLink({ href, children, active }: NavLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        theme.components.nav.link,
        active && theme.components.nav.activeLink
      )}
    >
      {children}
    </Link>
  )
}

interface NavigationProps {
  children: React.ReactNode
}

export function Navigation({ children }: NavigationProps) {
  return (
    <nav className={theme.components.nav.container}>
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {children}
      </div>
    </nav>
  )
}