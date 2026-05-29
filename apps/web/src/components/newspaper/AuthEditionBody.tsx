import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
  /** Image and any marginalia stacked beneath it (e.g. house rules). */
  sidebar: ReactNode
}

/** Main copy and form on the left; illustration + rail on the right (stacked on small screens). */
export function AuthEditionBody({ children, sidebar }: Props) {
  return (
    <div className="np-auth-edition-body">
      <div className="np-auth-edition-main">{children}</div>
      <div className="np-auth-edition-sidebar">{sidebar}</div>
    </div>
  )
}
