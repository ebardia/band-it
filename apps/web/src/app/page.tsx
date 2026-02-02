'use client'

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { MIN_MEMBERS_TO_ACTIVATE } from '@band-it/shared'
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
      {/* Test Mode Banner - positioned below nav buttons */}
      {showBanner && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-10">
          <div className="inline-flex items-start gap-3 bg-white border-2 border-amber-400 rounded-lg px-4 py-3 shadow-md max-w-2xl">
            <span className="text-xl flex-shrink-0">🚧</span>
            <div className="flex-1 text-sm text-amber-900">
              <strong>TEST MODE</strong> — This platform is currently in testing. Please read the{' '}
              <Link href="/about" className="underline font-semibold hover:text-amber-700">
                Learn More
              </Link>{' '}
              section to understand what Band It is about. You can register with any email
              (we don't verify emails yet) and explore the platform: browse bands, apply to join,
              or create your own. In test mode creating a band requires {MIN_MEMBERS_TO_ACTIVATE} member{MIN_MEMBERS_TO_ACTIVATE === 1 ? '' : 's'} to activate.
              Once active, create discussions, proposals, projects, tasks, and more. Please use the
              feedback button to report bugs and share suggestions. The site does not currently adapt
              well to mobile devices; it is best accessed on laptop/desktop. However after you register
              and become active, you can access the site through your mobile device where you will see
              micro actions you can perform on a daily basis.
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
        <Center className="min-h-screen pt-32">
        <Stack spacing="md" className="items-center mt-24">
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
            className="-mt-4"
          >
            Learn More
          </Button>
        </Stack>
      </Center>
      </PageLayout>
    </div>
  )
}