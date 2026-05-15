export type EditorialNavItemId = 'work' | 'play' | 'talk'

export type EditorialNavItem = {
  id: EditorialNavItemId
  label: string
  href: string
}

/** Primary strip — Work / Play / Talk It Out (Help + Account are separate controls). */
export const EDITORIAL_PRIMARY_ITEMS: EditorialNavItem[] = [
  { id: 'work', label: 'Work', href: '/my-projects' },
  { id: 'play', label: 'Play', href: '/play' },
  { id: 'talk', label: 'Talk It Out', href: '/talk-it-out' },
]

export const EDITORIAL_ACCOUNT_PATHS = [
  '/user-dashboard/profile',
  '/user-dashboard/settings',
  '/user-dashboard/subscription',
] as const

export function isEditorialNavActive(pathname: string, href: string): boolean {
  if (href === '/my-projects') {
    return pathname === '/my-projects' || pathname.startsWith('/my-projects/')
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function isEditorialAccountActive(pathname: string): boolean {
  return EDITORIAL_ACCOUNT_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  )
}
