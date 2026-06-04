'use client'

import { useRouter, usePathname } from 'next/navigation'
import { Stack, NavButton, Text } from '@/components/ui'

export function AdminSidebar() {
  const router = useRouter()
  const pathname = usePathname()

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/')

  const mainNav = [
    { label: '📊 Dashboard', path: '/admin' },
    { label: '📈 Analytics', path: '/admin/analytics' },
    { label: '👥 Users', path: '/admin/users' },
    { label: '🚪 Waiting room', path: '/admin/waiting-room' },
    { label: '🎸 Bands', path: '/admin/bands' },
  ]

  const moderationNav = [
    { label: '🛡️ Moderation Queue', path: '/admin/moderation' },
    { label: '🚩 User Reports', path: '/admin/reports' },
    { label: '🚫 Blocked Terms', path: '/admin/blocked-terms' },
  ]

  const contentNav = [
    { label: '❓ FAQ Management', path: '/admin/faq' },
  ]

  const systemNav = [
    { label: '📜 Audit Log', path: '/admin/audit' },
    { label: '🕐 Cron Jobs', path: '/admin/cron-jobs' },
    { label: '⚙️ Settings', path: '/admin/settings' },
  ]

  return (
    <aside className="w-52 bg-white rounded-lg shadow p-4 flex flex-col">
      <Stack spacing="lg" className="flex-1">
        {/* Main Navigation */}
        <Stack spacing="sm">
          <Text variant="small" weight="semibold" className="text-gray-500 uppercase text-xs px-2">
            Overview
          </Text>
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

        {/* Moderation */}
        <Stack spacing="sm">
          <Text variant="small" weight="semibold" className="text-gray-500 uppercase text-xs px-2">
            Moderation
          </Text>
          {moderationNav.map((item) => (
            <NavButton
              key={item.path}
              active={isActive(item.path)}
              onClick={() => router.push(item.path)}
            >
              {item.label}
            </NavButton>
          ))}
        </Stack>

        {/* Content */}
        <Stack spacing="sm">
          <Text variant="small" weight="semibold" className="text-gray-500 uppercase text-xs px-2">
            Content
          </Text>
          {contentNav.map((item) => (
            <NavButton
              key={item.path}
              active={isActive(item.path)}
              onClick={() => router.push(item.path)}
            >
              {item.label}
            </NavButton>
          ))}
        </Stack>

        {/* System */}
        <Stack spacing="sm">
          <Text variant="small" weight="semibold" className="text-gray-500 uppercase text-xs px-2">
            System
          </Text>
          {systemNav.map((item) => (
            <NavButton
              key={item.path}
              active={isActive(item.path)}
              onClick={() => router.push(item.path)}
            >
              {item.label}
            </NavButton>
          ))}
        </Stack>
      </Stack>

      {/* Back to App */}
      <div className="pt-4 mt-4 border-t border-gray-200">
        <NavButton
          onClick={() => router.push('/user-dashboard')}
          className="text-blue-600 hover:bg-blue-50"
        >
          ← Back to App
        </NavButton>
      </div>
    </aside>
  )
}
