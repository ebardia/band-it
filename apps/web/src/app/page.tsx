'use client'

import Image from "next/image"
import { useRouter } from "next/navigation"
import {
  PageLayout,
  Container,
  Button,
  Stack,
  Center,
  Flex
} from "@/components/ui"

export default function HomePage() {
  const router = useRouter()

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
                Sign In
              </Button>
            </Flex>
          </Stack>
        </Center>
      </Container>
    </PageLayout>
  )
}