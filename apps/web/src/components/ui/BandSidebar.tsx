'use client'

import { useRouter, usePathname } from 'next/navigation'
import { Stack, NavButton } from '@/components/ui'

interface BandSidebarProps {
  bandSlug: string
  canApprove: boolean
  isMember: boolean
}

export function BandSidebar({ bandSlug, canApprove, isMember }: BandSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()

  const navItems = [
    { label: 'Details', path: `/bands/${bandSlug}`, show: true },
    { label: 'Applications', path: `/bands/${bandSlug}/applications`, show: canApprove },
    { label: 'Invite Members', path: `/bands/${bandSlug}/invite`, show: isMember },
    { label: 'Apply to Join', path: `/bands/${bandSlug}/apply`, show: !isMember },
  ].filter(item => item.show)

  const isActive = (path: string) => pathname === path

  return (
    <aside className="w-48 bg-white rounded-lg shadow p-3">
      <Stack spacing="sm">
        {navItems.map((item) => (
          <NavButton
            key={item.path}
            active={isActive(item.path)}
            onClick={() => router.push(item.path)}
          >
            {item.label}
          </NavButton>
        ))}
      </Stack>
    </aside>
  )
}