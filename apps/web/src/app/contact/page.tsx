'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import {
  Button,
  Input,
  Card,
  Container,
  Heading,
  Text,
  useToast,
  Stack,
  Flex,
  Footer,
} from '@/components/ui'

export default function ContactPage() {
  const router = useRouter()
  const { showToast } = useToast()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  })
  const [submitted, setSubmitted] = useState(false)

  const contactMutation = trpc.contact.submit.useMutation({
    onSuccess: () => {
      setSubmitted(true)
      showToast('Message sent successfully!', 'success')
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    contactMutation.mutate(formData)
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-purple-50">
        {/* Top navigation bar */}
        <div className="p-4">
          <Flex justify="between" align="center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/')}
            >
              Home
            </Button>
            <Flex gap="sm">
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
          </Flex>
        </div>

        <main className="flex-1">
          <Container size="sm" className="py-12">
            <Card>
              <Stack spacing="lg" className="text-center py-8">
                <div className="text-green-500 mx-auto">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <Heading level={2}>Message Sent!</Heading>
                <Text variant="muted">
                  Thank you for reaching out. We'll get back to you as soon as possible.
                </Text>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSubmitted(false)
                    setFormData({ name: '', email: '', subject: '', message: '' })
                  }}
                >
                  Send Another Message
                </Button>
              </Stack>
            </Card>
          </Container>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Top navigation bar */}
      <div className="p-4">
        <Flex justify="between" align="center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/')}
          >
            Home
          </Button>
          <Flex gap="sm">
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
        </Flex>
      </div>

      <main className="flex-1">
        <Container size="sm" className="py-12">
          <Card>
            <Stack spacing="lg">
              <div className="text-center">
                <Heading level={1}>Contact Us</Heading>
                <Text variant="muted">
                  Have a question or feedback? We'd love to hear from you.
                </Text>
              </div>

              <form onSubmit={handleSubmit}>
                <Stack spacing="md">
                  <Input
                    label="Name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Your name"
                  />

                  <Input
                    label="Email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="your@email.com"
                  />

                  <Input
                    label="Subject"
                    type="text"
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="What is this about?"
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Message
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Tell us what's on your mind..."
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      minLength={10}
                    />
                    <p className="mt-1 text-xs text-gray-500">Minimum 10 characters</p>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    disabled={contactMutation.isPending}
                    className="w-full"
                  >
                    {contactMutation.isPending ? 'Sending...' : 'Send Message'}
                  </Button>
                </Stack>
              </form>
            </Stack>
          </Card>
        </Container>
      </main>
      <Footer />
    </div>
  )
}
