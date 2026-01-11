'use client'

import { UserDashboardLayout } from '@/components/UserDashboardLayout'
import { 
  Heading, 
  Text, 
  Stack, 
  Card,
  Alert,
  Badge,
  Flex
} from '@/components/ui'

export default function UserDashboardPage() {
  return (
    <UserDashboardLayout>
      <Stack spacing="lg">
        <Heading level={1}>Dashboard Overview</Heading>
        <Text variant="muted">Welcome back! Here's your account summary.</Text>

        <Alert variant="success">
          <Stack spacing="sm">
            <Flex justify="between">
              <Text variant="small" weight="semibold">Account Status</Text>
              <Badge variant="success">Active</Badge>
            </Flex>
            <Text variant="small">Your subscription is active and all features are available.</Text>
          </Stack>
        </Alert>

        <Card>
          <Stack spacing="md">
            <Heading level={3}>Quick Stats</Heading>
            <Text variant="small">Bands: 0</Text>
            <Text variant="small">Active Proposals: 0</Text>
            <Text variant="small">Assigned Tasks: 0</Text>
          </Stack>
        </Card>
      </Stack>
    </UserDashboardLayout>
  )
}