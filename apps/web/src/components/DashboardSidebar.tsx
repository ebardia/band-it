'use client'

import { useRouter, usePathname } from 'next/navigation'
import { Stack, NavButton, Heading, Badge } from '@/components/ui'

interface DashboardSidebarProps {
  bandCount?: number
}

export function DashboardSidebar({ bandCount = 0 }: DashboardSidebarProps) {
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
      path: '/proposals', 
      count: 0,
      available: false 
    },
    { 
      label: 'My Projects', 
      path: '/projects', 
      count: 0,
      available: false 
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