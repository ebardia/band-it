'use client'

import { ReactNode } from 'react'
import { Text, Flex, Stack } from '.'
import { AdminSidebar } from './AdminSidebar'

interface AdminLayoutProps {
  children: ReactNode
  pageTitle: string
  subtitle?: string
  action?: ReactNode
}

export function AdminLayout({
  children,
  pageTitle,
  subtitle,
  action,
}: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto px-4 max-w-7xl">
        {/* Page Header */}
        <div className="py-6">
          <Flex gap="md" align="start">
            {/* Spacer to match sidebar width */}
            <div className="w-52 flex-shrink-0" />

            {/* Header content aligned with main content */}
            <div className="flex-1">
              <Flex justify="between" align="center">
                <Stack spacing="xs">
                  <h1 className="text-3xl font-bold text-gray-900">{pageTitle}</h1>
                  {subtitle && <Text color="muted">{subtitle}</Text>}
                </Stack>
                {action && <div>{action}</div>}
              </Flex>
            </div>
          </Flex>
        </div>

        {/* Main Content Area */}
        <div className="pb-8">
          <Flex gap="md" align="start">
            {/* Left Sidebar */}
            <AdminSidebar />

            {/* Main Content */}
            <div className="flex-1 bg-white rounded-lg shadow p-8">
              {children}
            </div>
          </Flex>
        </div>
      </div>
    </div>
  )
}
