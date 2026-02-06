'use client'

import { useRouter } from 'next/navigation'
import {
  Container,
  Button,
  Stack,
  Heading,
  Text,
  Card,
  Flex,
  Footer,
} from '@/components/ui'

export default function CommunityGuidelinesPage() {
  const router = useRouter()

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

      {/* Main content */}
      <main className="flex-1">
        <Container size="md" className="py-12">
          <Stack spacing="lg">
            <div className="text-center">
              <Heading level={1}>Community Guidelines</Heading>
              <Text color="muted" className="mt-2">
                Last updated: February 2025
              </Text>
            </div>

            <Card>
              <Stack spacing="lg">
                <Text className="text-lg">
                  Band It is a family-friendly platform where people of all ages collaborate to achieve shared goals.
                  By joining and participating in Band It, you agree to follow these community guidelines.
                </Text>

                <div>
                  <Heading level={3} className="mb-3">Core Principles</Heading>
                  <Stack spacing="md">
                    <div>
                      <Text weight="semibold">No Illegal Activity or Speech</Text>
                      <Text color="muted" variant="small">
                        Do not use Band It to plan, promote, or engage in any illegal activities.
                        This includes but is not limited to fraud, theft, or violations of applicable laws.
                      </Text>
                    </div>

                    <div>
                      <Text weight="semibold">No Spam or Scams</Text>
                      <Text color="muted" variant="small">
                        Do not send unsolicited marketing messages, chain letters, or engage in deceptive practices
                        designed to mislead other members or extract money/information from them.
                      </Text>
                    </div>

                    <div>
                      <Text weight="semibold">No Violence, Threats, or Harassment</Text>
                      <Text color="muted" variant="small">
                        Do not threaten, intimidate, bully, or harass other members. This includes direct threats,
                        doxxing, stalking behavior, or repeated unwanted contact.
                      </Text>
                    </div>

                    <div>
                      <Text weight="semibold">No Hate Speech or Discrimination</Text>
                      <Text color="muted" variant="small">
                        Do not attack or demean others based on race, ethnicity, national origin, religion,
                        gender, gender identity, sexual orientation, disability, age, or other protected characteristics.
                      </Text>
                    </div>

                    <div>
                      <Text weight="semibold">Respect for Minors</Text>
                      <Text color="muted" variant="small">
                        Remember that minors may participate in band activities. Keep all content appropriate
                        for a general audience. Never share inappropriate content with or about minors.
                      </Text>
                    </div>

                    <div>
                      <Text weight="semibold">Keep Content Appropriate</Text>
                      <Text color="muted" variant="small">
                        All content shared on Band It should be appropriate for a general audience.
                        Avoid explicit, graphic, or adult-only material.
                      </Text>
                    </div>
                  </Stack>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <Heading level={4} className="text-yellow-800 mb-2">Enforcement</Heading>
                  <Text variant="small" className="text-yellow-800">
                    Violating these community guidelines may result in warnings, temporary suspension,
                    or permanent removal from Band It. We reserve the right to remove content and
                    suspend accounts at our discretion to maintain a safe and welcoming environment.
                  </Text>
                </div>

                <div>
                  <Heading level={3} className="mb-3">Reporting Violations</Heading>
                  <Text>
                    If you encounter content or behavior that violates these guidelines, please use the
                    feedback button to report it. We take all reports seriously and will investigate promptly.
                  </Text>
                </div>

                <div>
                  <Heading level={3} className="mb-3">Questions?</Heading>
                  <Text>
                    If you have questions about these guidelines or need clarification on what is
                    or isn't allowed, please reach out through the feedback button.
                  </Text>
                </div>
              </Stack>
            </Card>
          </Stack>
        </Container>
      </main>

      <Footer />
    </div>
  )
}
