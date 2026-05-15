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
  /** Editorial / paper chrome (matches /daily); use with profile layout + EditorialSurface */
  editorial?: boolean
}

export function UserDashboardLayout({
  children,
  showSidebar = false,
  pageTitle,
  editorial = false,
}: UserDashboardLayoutProps) {
  const router = useRouter()

  if (pageTitle) {
    const wrapVariant = editorial ? 'paper' : 'dashboard'
    const backHover = editorial
      ? 'hover:bg-neutral-100 active:bg-neutral-200'
      : 'hover:bg-gray-100 active:bg-gray-200'
    const titleClass = editorial
      ? 'np-editorial-dashboard-title truncate'
      : 'text-xl md:text-2xl font-bold text-gray-900 truncate'
    const iconClass = editorial ? 'text-neutral-700' : 'text-gray-600'

    return (
      <PageWrapper variant={wrapVariant}>
        {!editorial && <AppNav />}
        <div className="mx-auto px-0 md:px-4 max-w-[1600px] w-full py-2 md:py-6">
          <div className={`flex items-center gap-2 mb-4 px-3 md:px-0 ${editorial ? 'border-b border-neutral-200 pb-3' : ''}`}>
            <button
              type="button"
              onClick={() => router.push(editorial ? '/daily' : '/user-dashboard')}
              className={`w-9 h-9 flex items-center justify-center rounded-lg ${backHover} flex-shrink-0`}
              aria-label={editorial ? 'Back to Daily' : 'Back to dashboard'}
            >
              <svg className={`w-5 h-5 ${iconClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className={titleClass}>{pageTitle}</h1>
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