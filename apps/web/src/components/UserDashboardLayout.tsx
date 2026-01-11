'use client'

import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'
import { 
  Stack, 
  Flex, 
  Button,
  useToast,
  Sidebar,
  NavButton,
  PageWrapper,
  TopNav,
  DashboardContainer,
  Text,
  Heading
} from '@/components/ui'

interface UserDashboardLayoutProps {
  children: React.ReactNode
}

export function UserDashboardLayout({ children }: UserDashboardLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { showToast } = useToast()

  const handleLogout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('userEmail')
    showToast('Logged out successfully', 'success')
    router.push('/')
  }

  const navItems = [
    { label: 'Overview', path: '/user-dashboard' },
    { label: 'Profile', path: '/user-dashboard/profile' },
    { label: 'Subscription', path: '/user-dashboard/subscription' },
    { label: 'Settings', path: '/user-dashboard/settings' },
  ]

  const isActive = (path: string) => pathname === path

  return (
    <PageWrapper variant="dashboard">
      <TopNav>
        <Flex justify="between">
          <Image 
            src="/logo.png" 
            alt="Band IT Logo" 
            width={200} 
            height={200}
            priority
          />
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            Logout
          </Button>
        </Flex>
      </TopNav>

      <DashboardContainer>
        <Flex gap="md" align="start">
          {/* Left Sidebar - Navigation (Narrow) */}
          <aside className="w-48 bg-white rounded-lg shadow p-3">
            <Stack spacing="sm">
              {navItems.map((item) => (
                <NavButton
                  key={item.path}
                  active={isActive(item.path)}
                  onClick={() => router.push(item.path)}
                >
                  {item.label}
                </NavButton>
              ))}
            </Stack>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 bg-white rounded-lg shadow p-6">
            {children}
          </main>

          {/* Right Sidebar - Messages/Activity */}
          <aside className="w-96 bg-white rounded-lg shadow p-4">
            <Stack spacing="md">
              <Heading level={3}>Activity</Heading>
              <Text variant="small" variant="muted">
                Messages and notifications will appear here
              </Text>
            </Stack>
          </aside>
        </Flex>
      </DashboardContainer>
    </PageWrapper>
  )
}