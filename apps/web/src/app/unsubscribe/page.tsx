'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { trpc } from '@/lib/trpc'
import { Heading, Text, Stack, Button, Alert, Spinner } from '@/components/ui'

function UnsubscribeContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')

  const unsubscribeMutation = trpc.digest.unsubscribe.useMutation({
    onSuccess: () => {
      setStatus('success')
    },
    onError: (error) => {
      setStatus('error')
      setErrorMessage(error.message)
    },
  })

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setErrorMessage('No unsubscribe token provided')
      return
    }

    // Automatically unsubscribe when page loads with valid token
    unsubscribeMutation.mutate({ token })
  }, [token])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        <div className="mb-6">
          <Image
            src="/logo.png"
            alt="Band It Logo"
            width={120}
            height={120}
            className="mx-auto"
          />
        </div>

        {status === 'loading' && (
          <Stack spacing="md" className="items-center">
            <Spinner size="lg" />
            <Text>Processing your request...</Text>
          </Stack>
        )}

        {status === 'success' && (
          <Stack spacing="md">
            <div className="text-5xl mb-2">✓</div>
            <Heading level={2}>Unsubscribed</Heading>
            <Text color="muted">
              You've been unsubscribed from digest emails.
            </Text>
            <Text variant="small" color="muted" className="mt-4">
              Changed your mind?
            </Text>
            <Link href="/user-dashboard/settings">
              <Button variant="secondary" size="md">
                Update Preferences
              </Button>
            </Link>
          </Stack>
        )}

        {status === 'error' && (
          <Stack spacing="md">
            <Alert variant="danger">
              <Text>{errorMessage || 'Something went wrong'}</Text>
            </Alert>
            <Text variant="small" color="muted" className="mt-4">
              If you believe this is an error, please try again or contact support.
            </Text>
            <Link href="/">
              <Button variant="secondary" size="md">
                Go to Homepage
              </Button>
            </Link>
          </Stack>
        )}
      </div>
    </div>
  )
}

export default function UnsubscribePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
            <Spinner size="lg" />
            <Text className="mt-4">Loading...</Text>
          </div>
        </div>
      }
    >
      <UnsubscribeContent />
    </Suspense>
  )
}
