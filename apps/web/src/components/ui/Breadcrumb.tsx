import Link from 'next/link'
import { theme } from '@band-it/shared'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className={theme.components.breadcrumb.container}>
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          {index > 0 && (
            <span className={theme.components.breadcrumb.separator}>/</span>
          )}
          
          {item.href && index < items.length - 1 ? (
            <Link href={item.href} className={theme.components.breadcrumb.link}>
              {item.label}
            </Link>
          ) : (
            <span className={theme.components.breadcrumb.current}>
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  )
}