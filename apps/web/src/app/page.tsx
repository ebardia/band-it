'use client'

import Image from "next/image"
import { useRouter } from "next/navigation"
import { trpc } from "@/lib/trpc"
import {
  PageLayout,
  Container,
  Heading,
  Text,
  Button,
  Stack,
  Center,
  Card,
  Alert,
  Flex
} from "@/components/ui"

export default function HomePage() {
  const router = useRouter()
  const { data: helloData, isLoading: helloLoading } = trpc.test.hello.useQuery({ name: 'Band IT' })
  const { data: healthData } = trpc.test.health.useQuery()
  const { data: dbData, isLoading: dbLoading } = trpc.test.dbTest.useQuery()

  return (
    <PageLayout>
      <Container size="md">
        <Center>
          <Stack spacing="xl">
            <Image 
              src="/logo.png" 
              alt="Band IT Logo" 
              width={600} 
              height={600}
              priority
            />

            <Card>
              <Stack spacing="md">
                <Heading level={3}>System Status</Heading>
                
                <Alert variant="info">
                  <Text variant="small" weight="semibold">API Connection</Text>
                  {helloLoading ? (
                    <Text variant="small">Testing...</Text>
                  ) : (
                    <Text variant="small" color="success">✅ {helloData?.greeting}</Text>
                  )}
                </Alert>

                <Alert variant="info">
                  <Text variant="small" weight="semibold">Backend Health</Text>
                  <Text variant="small" color="success">✅ {healthData?.status}</Text>
                </Alert>

                <Alert variant="info">
                  <Text variant="small" weight="semibold">Database Connection</Text>
                  {dbLoading ? (
                    <Text variant="small">Testing...</Text>
                  ) : dbData?.status === 'connected' ? (
                    <Stack spacing="sm">
                      <Text variant="small" color="success">✅ Connected to PostgreSQL</Text>
                      <Text variant="small">
                        Users: {dbData.users} | Bands: {dbData.bands}
                      </Text>
                    </Stack>
                  ) : (
                    <Text variant="small" color="danger">❌ Connection failed</Text>
                  )}
                </Alert>
              </Stack>
            </Card>

            <Flex justify="center" gap="md">
              <Button 
                variant="primary" 
                size="lg"
                onClick={() => router.push('/register')}
              >
                Get Started
              </Button>
              <Button 
                variant="secondary" 
                size="lg"
                onClick={() => router.push('/login')}
              >
                Learn More
              </Button>
            </Flex>
          </Stack>
        </Center>
      </Container>
    </PageLayout>
  )
}