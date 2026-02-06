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
  Progress,
  Alert,
  Loading,
  Flex
} from '@/components/ui'

// Current version of community guidelines - increment when guidelines change
const COMMUNITY_GUIDELINES_VERSION = 1
// Current version of Terms of Service & Privacy Policy - increment when they change
const TOS_VERSION = 1

function RegisterContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { showToast } = useToast()
  const inviteToken = searchParams.get('invite')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [guidelinesAccepted, setGuidelinesAccepted] = useState(false)
  const [tosAccepted, setTosAccepted] = useState(false)

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: (data) => {
      localStorage.setItem('accessToken', data.accessToken)
      localStorage.setItem('refreshToken', data.refreshToken)
      localStorage.setItem('userEmail', formData.email)

      const hasInvites = data.bandsInvited && data.bandsInvited.length > 0

      // Show bands invited message if any
      if (hasInvites) {
        const bandNames = data.bandsInvited.map((b: { name: string }) => b.name).join(', ')
        showToast(`You've been invited to: ${bandNames}. Review and accept on the next page.`, 'info')
      }

      // Check if email is already verified (SKIP_EMAIL_VERIFICATION mode)
      // Use replace so register page isn't in browser history
      if (data.user.emailVerified) {
        if (!hasInvites) {
          showToast('Account created successfully!', 'success')
        }
        // Redirect to /discover if there are pending invites, otherwise /profile
        router.replace(hasInvites ? '/discover' : '/profile')
      } else {
        if (!hasInvites) {
          showToast('Account created! Please check your email.', 'success')
        }
        router.replace('/verify-email')
      }
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!guidelinesAccepted) {
      showToast('Please accept the community guidelines to continue', 'error')
      return
    }
    if (!tosAccepted) {
      showToast('Please accept the Terms of Service and Privacy Policy to continue', 'error')
      return
    }
    registerMutation.mutate({
      ...formData,
      inviteToken: inviteToken || undefined,
      guidelinesVersion: COMMUNITY_GUIDELINES_VERSION,
      tosVersion: TOS_VERSION,
    })
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

            {inviteToken && (
              <Alert variant="info">
                <Text variant="small">
                  You've been invited to join a band! Create your account to review and accept the invitation.
                </Text>
              </Alert>
            )}

            <Progress
              steps={[
                { label: 'Register', status: 'active' },
                { label: 'Verify', status: 'inactive' },
                { label: 'Profile', status: 'inactive' },
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

                <div className="relative">
                  <Input
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="At least 8 characters"
                    minLength={8}
                    helperText="Must be at least 8 characters"
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

                {/* Community Guidelines */}
                <div className="border rounded-lg p-4 bg-gray-50">
                  <Heading level={4} className="mb-3">Community Guidelines</Heading>
                  <Text variant="small" color="muted" className="mb-3">
                    Band It is a family-friendly platform where people of all ages collaborate. By joining, you agree to:
                  </Text>
                  <ul className="text-sm text-gray-700 space-y-1 mb-3 ml-4">
                    <li>• No illegal activity or speech</li>
                    <li>• No spam, unsolicited marketing, or scams</li>
                    <li>• No violent, threatening, or harassing language</li>
                    <li>• No hate speech or discrimination</li>
                    <li>• Respect that minors may participate in band activities</li>
                    <li>• Keep all content appropriate for a general audience</li>
                  </ul>
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-3">
                    <Text variant="small" className="text-yellow-800 font-medium">
                      Violating these principles may result in account suspension or removal from Band It.
                    </Text>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={guidelinesAccepted}
                      onChange={(e) => setGuidelinesAccepted(e.target.checked)}
                      className="rounded w-4 h-4"
                    />
                    <Text variant="small">
                      I have read and agree to follow these{' '}
                      <a href="/community-guidelines" target="_blank" className="text-blue-600 hover:underline">
                        community guidelines
                      </a>
                    </Text>
                  </label>
                </div>

                {/* Terms of Service & Privacy Policy */}
                <div className="border rounded-lg p-4 bg-gray-50">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tosAccepted}
                      onChange={(e) => setTosAccepted(e.target.checked)}
                      className="rounded w-4 h-4 mt-0.5"
                    />
                    <Text variant="small">
                      I agree to the{' '}
                      <a href="/terms" target="_blank" className="text-blue-600 hover:underline">
                        Terms of Service
                      </a>{' '}
                      and{' '}
                      <a href="/privacy" target="_blank" className="text-blue-600 hover:underline">
                        Privacy Policy
                      </a>
                    </Text>
                  </label>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={registerMutation.isPending || !guidelinesAccepted || !tosAccepted}
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

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <PageLayout>
        <Container size="sm">
          <Card>
            <Loading message="Loading..." />
          </Card>
        </Container>
      </PageLayout>
    }>
      <RegisterContent />
    </Suspense>
  )
}