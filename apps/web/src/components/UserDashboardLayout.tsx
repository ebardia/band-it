'use client'

import { useRouter } from 'next/navigation'
import { AppNav } from '@/components/AppNav'
import {
  PageWrapper,
  DashboardContainer,
  Flex,
  Sidebar,
  MainContent,
  RightSidebar
} from '@/components/ui'

interface UserDashboardLayoutProps {
  children: React.ReactNode
  showSidebar?: boolean
  /** When set, shows back arrow + title and uses tight layout (same as band pages) */
  pageTitle?: string
}

export function UserDashboardLayout({ children, showSidebar = false, pageTitle }: UserDashboardLayoutProps) {
  const router = useRouter()

  if (pageTitle) {
    return (
      <PageWrapper variant="dashboard">
        <AppNav />
        <div className="mx-auto px-0 md:px-4 max-w-[1600px] w-full py-2 md:py-6">
          <div className="flex items-center gap-2 mb-4 px-3 md:px-0">
            <button
              type="button"
              onClick={() => router.push('/user-dashboard')}
              className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 active:bg-gray-200 flex-shrink-0"
              aria-label="Back to dashboard"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 truncate">{pageTitle}</h1>
          </div>
          <div className="px-3 md:px-0">
            {children}
          </div>
        </div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper variant="dashboard">
      <AppNav />
      <DashboardContainer>
        {showSidebar ? (
          <Flex gap="md" align="start">
            <Sidebar>
              {/* Sidebar content can go here */}
            </Sidebar>
            <MainContent>
              {children}
            </MainContent>
            <RightSidebar>
              {/* Activity feed will go here */}
            </RightSidebar>
          </Flex>
        ) : (
          <MainContent>
            {children}
          </MainContent>
        )}
      </DashboardContainer>
    </PageWrapper>
  )
}