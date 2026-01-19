'use client'

import Image from "next/image"
import { useRouter } from "next/navigation"
import {
  PageLayout,
  Button,
  Stack,
  Center,
  Flex
} from "@/components/ui"

export default function HomePage() {
  const router = useRouter()

  return (
    <PageLayout>
      {/* Top navigation bar */}
      <div className="absolute top-0 left-0 right-0 p-4">
        <Flex justify="end" gap="sm">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/register')}
          >
            Register
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => router.push('/login')}
          >
            Sign In
          </Button>
        </Flex>
      </div>

      {/* Main content */}
      <Center className="min-h-screen">
        <Stack spacing="xl" className="items-center">
          <Image
            src="/logo.png"
            alt="Band IT Logo"
            width={600}
            height={600}
            priority
          />

          <Button
            variant="primary"
            size="lg"
            onClick={() => router.push('/about')}
          >
            Learn More
          </Button>
        </Stack>
      </Center>
    </PageLayout>
  )
}