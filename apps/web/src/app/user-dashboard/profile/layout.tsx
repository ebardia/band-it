import type { ReactNode } from 'react'
import { EditorialSurface } from '@/components/editorial/EditorialSurface'

export default function ProfileLayout({ children }: { children: ReactNode }) {
  return <EditorialSurface>{children}</EditorialSurface>
}
