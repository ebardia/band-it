'use client'

import { useRouter, usePathname } from 'next/navigation'
import { Stack, NavButton, Heading, Badge } from '@/components/ui'

interface DashboardSidebarProps {
  bandCount?: number
  proposalCount?: number
  projectCount?: number
  assignedTaskCount?: number
  projectTaskCount?: number
  taskCount?: number // backwards compatibility
}

export function DashboardSidebar({
  bandCount = 0,
  proposalCount = 0,
  projectCount = 0,
  assignedTaskCount,
  projectTaskCount = 0,
  taskCount = 0, // backwards compatibility
}: DashboardSidebarProps) {
  // Use assignedTaskCount if provided, otherwise fall back to taskCount
  const effectiveAssignedTaskCount = assignedTaskCount ?? taskCount
  const router = useRouter()
  const pathname = usePathname()

  const navItems = [
    {
      label: 'My Bands',
      path: '/bands/my-bands',
      count: bandCount,
      available: true,
      guide: 'dashboard-my-bands'
    },
    {
      label: 'Browse Bands',
      path: '/bands',
      count: 0,
      available: true,
      guide: 'dashboard-browse-bands'
    },
    {
      label: 'My Proposals',
      path: '/my-proposals',
      count: proposalCount,
      available: true,
      guide: 'dashboard-proposals'
    },
    {
      label: 'My Projects',
      path: '/my-projects',
      count: projectCount,
      subCount: projectTaskCount,
      subLabel: 'tasks',
      available: true,
      guide: 'dashboard-projects'
    },
    {
      label: 'Assigned Tasks',
      path: '/my-tasks',
      count: effectiveAssignedTaskCount,
      available: true,
      guide: 'dashboard-tasks'
    },
    { 
      label: 'Messages', 
      path: '/messages', 
      count: 0,
      available: false 
    },
    { 
      label: 'Vendors', 
      path: '/vendors', 
      count: 0,
      available: false 
    },
    { 
      label: 'Financials', 
      path: '/financials', 
      count: 0,
      available: false 
    },
    { 
      label: 'Documents', 
      path: '/documents', 
      count: 0,
      available: false 
    },
  ]

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/')

  return (
    <aside className="w-64 bg-white rounded-lg shadow p-4">
      <Stack spacing="md">
        <Heading level={3}>Dashboard</Heading>
        <Stack spacing="sm">
          {navItems.map((item: any) => (
            <div key={item.path} className="relative">
              <NavButton
                active={isActive(item.path)}
                onClick={() => item.available && router.push(item.path)}
                disabled={!item.available}
                data-guide={item.guide}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={!item.available ? 'text-gray-400' : ''}>
                    {item.label}
                  </span>
                  <div className="flex items-center gap-1">
                    {item.available && item.count > 0 && (
                      <Badge variant="info">{item.count}</Badge>
                    )}
                    {item.available && item.subCount > 0 && (
                      <span className="text-xs text-gray-500">({item.subCount} {item.subLabel})</span>
                    )}
                    {!item.available && (
                      <span className="text-xs text-gray-400">Soon</span>
                    )}
                  </div>
                </div>
              </NavButton>
            </div>
          ))}
        </Stack>
      </Stack>
    </aside>
  )
}