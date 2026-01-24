'use client'

import { useRouter, usePathname } from 'next/navigation'
import { Stack, NavButton, Text } from '@/components/ui'

interface BandSidebarProps {
  bandSlug: string
  bandName?: string
  canApprove?: boolean
  isMember?: boolean
  canCreateProposal?: boolean
  onLeaveBand?: () => void
}

export function BandSidebar({ bandSlug, bandName = '', canApprove = false, isMember = false, canCreateProposal = false, onLeaveBand }: BandSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/')

  // Main navigation - always visible
  const mainNav = [
    { label: `💬 ${bandName} Discussions`, path: `/bands/${bandSlug}` },
    { label: `ℹ️ ${bandName} About`, path: `/bands/${bandSlug}/about` },
    { label: `📝 ${bandName} Proposals`, path: `/bands/${bandSlug}/proposals` },
    { label: `📁 ${bandName} Projects`, path: `/bands/${bandSlug}/projects` },
    { label: `✅ ${bandName} Tasks`, path: `/bands/${bandSlug}/tasks` },
    { label: `📅 ${bandName} Events`, path: `/bands/${bandSlug}/events` },
    { label: `💰 ${bandName} Finance`, path: `/bands/${bandSlug}/finance` },
    { label: `💳 ${bandName} Billing`, path: `/bands/${bandSlug}/billing` },
    { label: `📜 ${bandName} Audit Log`, path: `/bands/${bandSlug}/audit` },
  ]

  // Member actions
  const memberActions = [
    { label: `👥 ${bandName} Members`, path: `/bands/${bandSlug}/members`, show: true },
    { label: '📨 Invite', path: `/bands/${bandSlug}/invite`, show: isMember },
    { label: '📋 Applications', path: `/bands/${bandSlug}/applications`, show: canApprove },
    { label: '⚙️ Settings', path: `/bands/${bandSlug}/settings`, show: isMember },
  ].filter(item => item.show !== false)

  // Non-member actions
  const nonMemberActions = [
    { label: '✋ Apply to Join', path: `/bands/${bandSlug}/apply`, show: !isMember },
  ].filter(item => item.show)

  return (
    <aside className="w-64 bg-white rounded-lg shadow p-4 flex flex-col">
      <Stack spacing="lg" className="flex-1">
        {/* Main Navigation */}
        <Stack spacing="sm">
          {mainNav.map((item) => (
            <NavButton
              key={item.path}
              active={isActive(item.path)}
              onClick={() => router.push(item.path)}
            >
              {item.label}
            </NavButton>
          ))}
        </Stack>

        {/* Member Actions */}
        {memberActions.length > 0 && (
          <Stack spacing="sm">
            <Text variant="small" weight="semibold" className="text-gray-500 uppercase text-xs px-2">
              Manage
            </Text>
            {memberActions.map((item) => (
              <NavButton
                key={item.path}
                active={isActive(item.path)}
                onClick={() => router.push(item.path)}
              >
                {item.label}
              </NavButton>
            ))}
          </Stack>
        )}

        {/* Non-member Actions */}
        {nonMemberActions.length > 0 && (
          <Stack spacing="sm">
            {nonMemberActions.map((item) => (
              <NavButton
                key={item.path}
                active={isActive(item.path)}
                onClick={() => router.push(item.path)}
              >
                {item.label}
              </NavButton>
            ))}
          </Stack>
        )}
      </Stack>

      {/* Leave Band - at bottom */}
      {isMember && onLeaveBand && (
        <div className="pt-4 mt-4 border-t border-gray-200">
          <NavButton
            onClick={onLeaveBand}
            className="text-red-600 hover:bg-red-50"
          >
            🚪 Leave Band
          </NavButton>
        </div>
      )}
    </aside>
  )
}