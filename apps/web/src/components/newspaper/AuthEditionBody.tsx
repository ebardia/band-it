import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
  /** Image and any marginalia stacked beneath it (e.g. house rules). */
  sidebar: ReactNode
  /** Register: clerk art left; proof: larger pigeon art on the right. */
  variant?: 'default' | 'register' | 'proof'
}

/** Illustration rail + main copy; on small screens the rail stacks on top. */
export function AuthEditionBody({ children, sidebar, variant = 'default' }: Props) {
  const bodyClass =
    variant === 'register'
      ? 'np-auth-edition-body np-auth-edition-body--register'
      : variant === 'proof'
        ? 'np-auth-edition-body np-auth-edition-body--proof'
        : 'np-auth-edition-body'

  const sidebarEl = <div className="np-auth-edition-sidebar">{sidebar}</div>
  const mainEl = <div className="np-auth-edition-main">{children}</div>

  return (
    <div className={bodyClass}>
      {variant === 'register' ? (
        <>
          {sidebarEl}
          {mainEl}
        </>
      ) : (
        <>
          {mainEl}
          {sidebarEl}
        </>
      )}
    </div>
  )
}
