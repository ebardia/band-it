import type { ReactNode } from 'react'
import { EditorialSurface } from '@/components/editorial/EditorialSurface'

export default function PlayLayout({ children }: { children: ReactNode }) {
  return <EditorialSurface>{children}</EditorialSurface>
}
