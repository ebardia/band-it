import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
  /** Image and any marginalia stacked beneath it (e.g. house rules). */
  sidebar: ReactNode
  /** Register: larger art flush right, rules under the image. */
  variant?: 'default' | 'register'
}

/** Main copy and form on the left; illustration + rail on the right (stacked on small screens). */
export function AuthEditionBody({ children, sidebar, variant = 'default' }: Props) {
  const bodyClass =
    variant === 'register'
      ? 'np-auth-edition-body np-auth-edition-body--register'
      : 'np-auth-edition-body'

  return (
    <div className={bodyClass}>
      <div className="np-auth-edition-main">{children}</div>
      <div className="np-auth-edition-sidebar">{sidebar}</div>
    </div>
  )
}
