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
  Progress
} from '@/components/ui'

export default function RegisterPage() {
  const router = useRouter()
  const { showToast } = useToast()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  })

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: (data) => {
      localStorage.setItem('accessToken', data.accessToken)
      localStorage.setItem('refreshToken', data.refreshToken)
      localStorage.setItem('userEmail', formData.email)
      
      showToast('Account created! Please check your email.', 'success')
      router.push('/verify-email')
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    registerMutation.mutate(formData)
  }

  return (
    <PageLayout>
      <Container size="sm">
        <Card>
          <Stack spacing="lg">
            <Center>
              <Heading level={1}>Create Account</Heading>
              <Text variant="muted">Join Band IT to start managing your band</Text>
            </Center>

            <Progress
              steps={[
                { label: 'Register', status: 'active' },
                { label: 'Verify', status: 'inactive' },
                { label: 'Profile', status: 'inactive' },
                { label: 'Payment', status: 'inactive' },
              ]}
            />

            <form onSubmit={handleSubmit}>
              <Stack spacing="lg">
                <Input
                  label="Full Name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Doe"
                />

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
                  placeholder="At least 8 characters"
                  minLength={8}
                  helperText="Must be at least 8 characters"
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={registerMutation.isPending}
                  className="w-full"
                >
                  {registerMutation.isPending ? 'Creating Account...' : 'Create Account'}
                </Button>
              </Stack>
            </form>

            <Center>
              <Text variant="small">
                Already have an account? <Link href="/login">Sign in</Link>
              </Text>
            </Center>
          </Stack>
        </Card>
      </Container>
    </PageLayout>
  )
}