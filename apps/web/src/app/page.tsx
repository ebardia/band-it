'use client'

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
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
  const [showBanner, setShowBanner] = useState(true)

  return (
    <div className="min-h-screen flex flex-col">
      {/* Test Mode Banner */}
      {showBanner && (
        <div className="bg-amber-100 border-b-2 border-amber-400 px-4 py-3">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-start gap-3">
              <span className="text-xl flex-shrink-0">🚧</span>
              <div className="flex-1 text-sm text-amber-900">
                <strong>TEST MODE</strong> — This platform is currently in testing. Please read the{' '}
                <Link href="/about" className="underline font-semibold hover:text-amber-700">
                  Learn More
                </Link>{' '}
                section to understand what Band It is about. You can register with any email
                (we don't verify emails yet) and explore the platform: browse bands, apply to join,
                or create your own. Creating a band requires 3 members to activate. To complete
                activation, use Stripe test card <code className="bg-amber-200 px-1 rounded">4242 4242 4242 4242</code> for payment.
                Once active, explore discussions, proposals, projects, tasks, and more. Please join the{' '}
                <Link href="/bands/band-it-development" className="underline font-semibold hover:text-amber-700">
                  Band It Development
                </Link>{' '}
                band to report bugs and share suggestions in the discussions.
              </div>
              <button
                onClick={() => setShowBanner(false)}
                className="text-amber-700 hover:text-amber-900 text-xl font-bold flex-shrink-0 leading-none"
                aria-label="Dismiss banner"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      <PageLayout>
        {/* Top navigation bar */}
        <div className="absolute top-0 right-0 p-4">
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
    </div>
  )
}