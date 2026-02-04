'use client'

import { useState, useEffect, Suspense } from 'react'
import { trpc } from '@/lib/trpc'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Button,
  Input,
  Card,
  PageLayout,
  Container,
  Heading,
  Text,
  useToast,
  Stack,
  Center,
  Link,
  Box
} from '@/components/ui'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { showToast } = useToast()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)

  // Get returnTo URL from query params (for quick action pages)
  const returnTo = searchParams.get('returnTo')

  // Redirect already logged-in users to dashboard (replace to avoid history bloat)
  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      router.replace(returnTo && returnTo.startsWith('/') ? returnTo : '/user-dashboard')
    }
  }, [router, returnTo])

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      localStorage.setItem('accessToken', data.accessToken)
      localStorage.setItem('refreshToken', data.refreshToken)

      if (!data.user.emailVerified) {
        showToast('Please verify your email before continuing.', 'warning')
        router.push('/verify-email')
        return
      }

      showToast(`Welcome back, ${data.user.name}!`, 'success')

      // Redirect to returnTo URL if provided (validate it's a safe internal path)
      if (returnTo && returnTo.startsWith('/')) {
        router.push(returnTo)
      } else {
        router.push('/user-dashboard')
      }
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    loginMutation.mutate(formData)
  }

  return (
    <Card>
      <Stack spacing="lg">
        <Center>
          <Heading level={1}>Welcome Back</Heading>
          <Text variant="muted">Sign in to your Band IT account</Text>
        </Center>

        <form onSubmit={handleSubmit}>
          <Stack spacing="lg">
            <Input
              label="Email Address"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="john@example.com"
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-9 text-gray-500 hover:text-gray-700"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>

            <Box align="right">
              <Link href="/forgot-password" variant="primary" size="sm">
                Forgot password?
              </Link>
            </Box>

            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={loginMutation.isPending}
              className="w-full"
            >
              {loginMutation.isPending ? 'Signing in...' : 'Sign In'}
            </Button>
          </Stack>
        </form>

        <Center>
          <Text variant="small">
            Don't have an account? <Link href="/register">Create one</Link>
          </Text>
        </Center>
      </Stack>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <PageLayout>
      <Container size="sm">
        <Suspense fallback={
          <Card>
            <Stack spacing="lg">
              <Center>
                <Heading level={1}>Welcome Back</Heading>
                <Text variant="muted">Loading...</Text>
              </Center>
            </Stack>
          </Card>
        }>
          <LoginForm />
        </Suspense>
      </Container>
    </PageLayout>
  )
}
