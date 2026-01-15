'use client'

import { useRouter, usePathname } from 'next/navigation'
import { Stack, NavButton, Heading, Badge } from '@/components/ui'

interface DashboardSidebarProps {
  bandCount?: number
  proposalCount?: number
  projectCount?: number
  taskCount?: number
}

export function DashboardSidebar({ 
  bandCount = 0,
  proposalCount = 0,
  projectCount = 0,
  taskCount = 0,
}: DashboardSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()

  const navItems = [
    { 
      label: 'My Bands', 
      path: '/bands/my-bands', 
      count: bandCount,
      available: true 
    },
    { 
      label: 'My Proposals', 
      path: '/my-proposals', 
      count: proposalCount,
      available: true 
    },
    { 
      label: 'My Projects', 
      path: '/my-projects', 
      count: projectCount,
      available: true 
    },
    { 
      label: 'My Tasks', 
      path: '/my-tasks', 
      count: taskCount,
      available: true 
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
        <Heading level={3}>My Dashboard</Heading>
        <Stack spacing="sm">
          {navItems.map((item) => (
            <div key={item.path} className="relative">
              <NavButton
                active={isActive(item.path)}
                onClick={() => item.available && router.push(item.path)}
                disabled={!item.available}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={!item.available ? 'text-gray-400' : ''}>
                    {item.label}
                  </span>
                  {item.available && item.count > 0 && (
                    <Badge variant="info">{item.count}</Badge>
                  )}
                  {!item.available && (
                    <span className="text-xs text-gray-400">Soon</span>
                  )}
                </div>
              </NavButton>
            </div>
          ))}
        </Stack>
      </Stack>
    </aside>
  )
}