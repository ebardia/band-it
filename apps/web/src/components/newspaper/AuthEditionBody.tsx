import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
  illustration: ReactNode
}

/** Main copy and form on the left; hero illustration on the right (stacked on small screens). */
export function AuthEditionBody({ children, illustration }: Props) {
  return (
    <div className="np-auth-edition-body">
      <div className="np-auth-edition-main">{children}</div>
      {illustration}
    </div>
  )
}
