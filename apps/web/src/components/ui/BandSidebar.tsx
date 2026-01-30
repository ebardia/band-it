'use client'

import { useRouter, usePathname } from 'next/navigation'
import { Stack, NavButton, Text } from '@/components/ui'

interface BandSidebarProps {
  bandSlug: string
  bandName?: string
  canApprove?: boolean
  isMember?: boolean
  canCreateProposal?: boolean
  canAccessAdminTools?: boolean
  onLeaveBand?: () => void
}

export function BandSidebar({ bandSlug, bandName = '', canApprove = false, isMember = false, canCreateProposal = false, canAccessAdminTools = false, onLeaveBand }: BandSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/')

  // Main navigation - always visible
  const mainNav = [
    { label: '💬 Discussions', path: `/bands/${bandSlug}`, guide: 'band-discussions' },
    { label: '📰 Forum', path: `/bands/${bandSlug}/forum`, guide: 'band-forum' },
    { label: '📝 Proposals', path: `/bands/${bandSlug}/proposals`, guide: 'band-proposals' },
    { label: '📁 Projects', path: `/bands/${bandSlug}/projects`, guide: 'band-projects' },
    { label: '✅ Tasks', path: `/bands/${bandSlug}/tasks`, guide: 'band-tasks' },
    { label: '📅 Events', path: `/bands/${bandSlug}/events`, guide: 'band-events' },
    { label: '💰 Finance', path: `/bands/${bandSlug}/finance`, guide: 'band-finance' },
    { label: '💳 Billing', path: `/bands/${bandSlug}/billing`, guide: 'band-billing' },
    { label: '📜 Audit Log', path: `/bands/${bandSlug}/audit`, guide: 'band-audit' },
    { label: 'ℹ️ About', path: `/bands/${bandSlug}/about`, guide: 'band-about' },
  ]

  // Member actions
  const memberActions = [
    { label: '👥 Members', path: `/bands/${bandSlug}/members`, show: true, guide: 'band-members' },
    { label: '📨 Invite', path: `/bands/${bandSlug}/invite`, show: isMember, guide: 'band-invite' },
    { label: '📋 Applications', path: `/bands/${bandSlug}/applications`, show: canApprove, guide: 'band-applications' },
    { label: '🛠️ Tools', path: `/bands/${bandSlug}/tools`, show: canAccessAdminTools, guide: 'band-tools' },
    { label: '⚙️ Settings', path: `/bands/${bandSlug}/settings`, show: isMember, guide: 'band-settings' },
  ].filter(item => item.show !== false)

  // Non-member actions
  const nonMemberActions = [
    { label: '✋ Apply to Join', path: `/bands/${bandSlug}/apply`, show: !isMember },
  ].filter(item => item.show)

  return (
    <aside className="hidden md:flex w-64 bg-white rounded-lg shadow p-4 flex-col flex-shrink-0">
      <Stack spacing="lg" className="flex-1">
        {/* Main Navigation */}
        <Stack spacing="sm">
          {mainNav.map((item) => (
            <NavButton
              key={item.path}
              active={isActive(item.path)}
              onClick={() => router.push(item.path)}
              data-guide={item.guide}
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
                data-guide={item.guide}
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