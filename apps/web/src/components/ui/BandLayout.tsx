'use client'

import { ReactNode } from 'react'
import { Text, Flex, Stack } from '.'
import { BandSidebar } from './BandSidebar'

export interface BandLayoutProps {
  children: ReactNode
  bandSlug: string
  bandName: string
  pageTitle: string
  canApprove?: boolean
  isMember?: boolean
  canCreateProposal?: boolean
  canAccessAdminTools?: boolean
  action?: ReactNode
  actions?: ReactNode // Alias for action
  rightSidebar?: ReactNode
  wide?: boolean
}

export function BandLayout({
  children,
  bandSlug,
  bandName,
  pageTitle,
  canApprove = false,
  isMember = false,
  canCreateProposal = false,
  canAccessAdminTools = false,
  action,
  actions,
  rightSidebar,
  wide = false,
}: BandLayoutProps) {
  const actionContent = action || actions
  return (
    <div className="min-h-screen bg-gray-50">
      <div className={`mx-auto px-4 ${wide ? 'max-w-[1600px]' : 'max-w-7xl'}`}>
        {/* Page Header - inside the same container */}
        <div className="py-6">
          <Flex gap="md" align="start">
            {/* Spacer to match sidebar width */}
            <div className="w-64 flex-shrink-0" />
            
            {/* Header content aligned with main content */}
            <div className="flex-1">
              <Flex justify="between" align="center">
                <Stack spacing="xs">
                  <h1 className="text-3xl font-bold text-gray-900">{pageTitle}</h1>
                  <Text color="muted">{bandName}</Text>
                </Stack>
                {actionContent && <div>{actionContent}</div>}
              </Flex>
            </div>

            {/* Spacer for right sidebar if present */}
            {rightSidebar && <div className="w-80 flex-shrink-0" />}
          </Flex>
        </div>

        {/* Main Content Area */}
        <div className="pb-8">
          <Flex gap="md" align="start">
            {/* Left Sidebar */}
            <BandSidebar
              bandSlug={bandSlug}
              bandName={bandName}
              canApprove={canApprove}
              isMember={isMember}
              canCreateProposal={canCreateProposal}
              canAccessAdminTools={canAccessAdminTools}
            />

            {/* Main Content */}
            <div className="flex-1 bg-white rounded-lg shadow p-8">
              {children}
            </div>

            {/* Optional Right Sidebar */}
            {rightSidebar}
          </Flex>
        </div>
      </div>
    </div>
  )
}