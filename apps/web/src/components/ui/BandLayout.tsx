'use client'

import { ReactNode, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Text, Flex, Stack } from '.'
import { BandSidebar } from './BandSidebar'
import { DuesBanner } from './DuesBanner'

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
  bandId?: string    // For dues enforcement banner
  userId?: string    // For dues enforcement banner
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
  bandId,
  userId,
}: BandLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [showMobileNav, setShowMobileNav] = useState(false)
  const actionContent = action || actions

  const isActive = (path: string) => {
    // Special case: Discussions is the band root, only match exactly
    if (path === `/bands/${bandSlug}`) {
      return pathname === path
    }
    return pathname === path || pathname.startsWith(path + '/')
  }

  // Mobile navigation items
  const mobileNavItems = [
    { label: 'Discussions', path: `/bands/${bandSlug}`, emoji: '💬' },
    { label: 'Forum', path: `/bands/${bandSlug}/forum`, emoji: '📰' },
    { label: 'Proposals', path: `/bands/${bandSlug}/proposals`, emoji: '📝' },
    { label: 'Projects', path: `/bands/${bandSlug}/projects`, emoji: '📁' },
    { label: 'Tasks', path: `/bands/${bandSlug}/tasks`, emoji: '✅' },
    { label: 'Events', path: `/bands/${bandSlug}/events`, emoji: '📅' },
    { label: 'Finance', path: `/bands/${bandSlug}/finance`, emoji: '💰' },
    { label: 'Members', path: `/bands/${bandSlug}/members`, emoji: '👥' },
    { label: 'About', path: `/bands/${bandSlug}/about`, emoji: 'ℹ️' },
  ]

  // Current page for mobile dropdown
  const currentPage = mobileNavItems.find(item => isActive(item.path)) || mobileNavItems[0]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className={`mx-auto px-2 md:px-4 ${wide ? 'max-w-[1600px]' : 'max-w-7xl'}`}>
        {/* Mobile Navigation Bar */}
        <div className="md:hidden py-3">
          {/* Band Name and Page Selector */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 truncate">{bandName}</h1>
              <Text color="muted" className="text-sm truncate">{pageTitle}</Text>
            </div>
            {actionContent && <div className="ml-2 flex-shrink-0">{actionContent}</div>}
          </div>

          {/* Mobile Page Navigation */}
          <div className="relative">
            <button
              onClick={() => setShowMobileNav(!showMobileNav)}
              className="w-full flex items-center justify-between px-4 py-3 bg-white rounded-lg shadow border border-gray-200"
            >
              <span className="flex items-center gap-2">
                <span>{currentPage.emoji}</span>
                <span className="font-medium">{currentPage.label}</span>
              </span>
              <svg
                className={`w-5 h-5 text-gray-500 transition-transform ${showMobileNav ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Mobile Navigation Dropdown */}
            {showMobileNav && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-80 overflow-y-auto">
                {mobileNavItems.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => {
                      setShowMobileNav(false)
                      router.push(item.path)
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      isActive(item.path)
                        ? 'bg-blue-50 text-blue-600 font-semibold'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span>{item.emoji}</span>
                    <span>{item.label}</span>
                  </button>
                ))}

                {/* Additional mobile menu items */}
                <hr className="my-1 border-gray-200" />
                {isMember && (
                  <>
                    <button
                      onClick={() => { setShowMobileNav(false); router.push(`/bands/${bandSlug}/invite`) }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 hover:bg-gray-50"
                    >
                      <span>📨</span>
                      <span>Invite</span>
                    </button>
                    <button
                      onClick={() => { setShowMobileNav(false); router.push(`/bands/${bandSlug}/billing`) }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 hover:bg-gray-50"
                    >
                      <span>💳</span>
                      <span>Billing</span>
                    </button>
                    <button
                      onClick={() => { setShowMobileNav(false); router.push(`/bands/${bandSlug}/audit`) }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 hover:bg-gray-50"
                    >
                      <span>📜</span>
                      <span>Audit Log</span>
                    </button>
                  </>
                )}
                {canApprove && (
                  <button
                    onClick={() => { setShowMobileNav(false); router.push(`/bands/${bandSlug}/applications`) }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 hover:bg-gray-50"
                  >
                    <span>📋</span>
                    <span>Applications</span>
                  </button>
                )}
                {canAccessAdminTools && (
                  <button
                    onClick={() => { setShowMobileNav(false); router.push(`/bands/${bandSlug}/tools`) }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 hover:bg-gray-50"
                  >
                    <span>🛠️</span>
                    <span>Tools</span>
                  </button>
                )}
                {isMember && (
                  <button
                    onClick={() => { setShowMobileNav(false); router.push(`/bands/${bandSlug}/settings`) }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 hover:bg-gray-50"
                  >
                    <span>⚙️</span>
                    <span>Settings</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Desktop Page Header */}
        <div className="hidden md:block py-6">
          {/* Band Name - large, top level */}
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{bandName}</h1>

          {/* Page Title - aligned with main content (after sidebar width) */}
          <Flex gap="md" align="center">
            {/* Spacer to match sidebar width */}
            <div className="w-64 flex-shrink-0" />

            {/* Page title and actions above main content */}
            <Flex justify="between" align="center" className="flex-1">
              <h2 className="text-2xl font-semibold text-gray-700">{pageTitle}</h2>
              {actionContent && <div>{actionContent}</div>}
            </Flex>
          </Flex>
        </div>

        {/* Main Content Area */}
        <div className="pb-8">
          <Flex gap="md" align="start" className="flex-col md:flex-row">
            {/* Left Sidebar - Hidden on mobile */}
            <BandSidebar
              bandSlug={bandSlug}
              bandName={bandName}
              canApprove={canApprove}
              isMember={isMember}
              canCreateProposal={canCreateProposal}
              canAccessAdminTools={canAccessAdminTools}
            />

            {/* Main Content */}
            <div className="w-full md:flex-1 bg-white rounded-lg shadow p-4 md:p-8">
              {bandId && userId && (
                <DuesBanner bandId={bandId} bandSlug={bandSlug} userId={userId} />
              )}
              {children}
            </div>

            {/* Optional Right Sidebar - Hidden on mobile */}
            {rightSidebar && (
              <div className="hidden lg:block">
                {rightSidebar}
              </div>
            )}
          </Flex>
        </div>
      </div>
    </div>
  )
}