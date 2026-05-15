import type { ReactNode } from 'react'
import { EditorialSurface } from '@/components/editorial/EditorialSurface'

export default function TalkItOutLayout({ children }: { children: ReactNode }) {
  return <EditorialSurface>{children}</EditorialSurface>
}
