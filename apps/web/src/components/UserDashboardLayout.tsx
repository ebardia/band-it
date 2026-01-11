'use client'

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
}

export function UserDashboardLayout({ children, showSidebar = false }: UserDashboardLayoutProps) {
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