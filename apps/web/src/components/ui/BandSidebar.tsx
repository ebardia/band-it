'use client'

import { usePathname } from 'next/navigation'
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
  const pathname = usePathname()

  const isActive = (path: string) => {
    // Special case: Discussions is the band root, only match exactly
    if (path === `/bands/${bandSlug}`) {
      return pathname === path
    }
    return pathname === path || pathname.startsWith(path + '/')
  }

  // Main navigation - always visible
  const mainNav = [
    { label: '💬 Discussions', path: `/bands/${bandSlug}`, guide: 'band-discussions' },
    { label: '📝 Posts', path: `/bands/${bandSlug}/posts`, guide: 'band-posts' },
    { label: '📝 Proposals', path: `/bands/${bandSlug}/proposals`, guide: 'band-proposals' },
    { label: '📁 Projects', path: `/bands/${bandSlug}/projects`, guide: 'band-projects' },
    { label: '✅ Tasks', path: `/bands/${bandSlug}/tasks`, guide: 'band-tasks' },
    { label: '📅 Calendar', path: `/bands/${bandSlug}/calendar`, guide: 'band-calendar' },
    { label: '💰 Finance', path: `/bands/${bandSlug}/finance`, guide: 'band-finance' },
    { label: '📜 Audit Log', path: `/bands/${bandSlug}/audit`, guide: 'band-audit' },
    { label: '📄 Documents', path: `/bands/${bandSlug}/documents`, guide: 'band-documents' },
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
        {/* User Dashboard Link */}
        <NavButton
          href="/daily"
          active={false}
          data-guide="back-to-dashboard"
          className="border-b border-gray-200 pb-3 mb-1"
        >
          ← Home / Daily
        </NavButton>

        {/* Main Navigation */}
        <Stack spacing="sm">
          {mainNav.map((item) => (
            <NavButton
              key={item.path}
              active={isActive(item.path)}
              href={item.path}
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
                href={item.path}
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
                href={item.path}
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