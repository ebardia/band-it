'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { useRouter } from 'next/navigation'
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

export default function LoginPage() {
  const router = useRouter()
  const { showToast } = useToast()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })

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
      router.push('/user-dashboard')
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
    <PageLayout>
      <Container size="sm">
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

                <Input
                  label="Password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter your password"
                />

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
      </Container>
    </PageLayout>
  )
}