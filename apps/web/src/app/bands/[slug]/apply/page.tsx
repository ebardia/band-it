'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { jwtDecode } from 'jwt-decode'
import {
  Heading,
  Text,
  Stack,
  Textarea,
  Button,
  useToast,
  PageWrapper,
  TopNav,
  DashboardContainer,
  Flex,
  Card,
  Alert,
  Loading
} from '@/components/ui'
import Image from 'next/image'

export default function ApplyToBandPage() {
  const router = useRouter()
  const params = useParams()
  const { showToast } = useToast()
  const slug = params.slug as string
  const [userId, setUserId] = useState<string | null>(null)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      try {
        const decoded: any = jwtDecode(token)
        setUserId(decoded.userId)
      } catch (error) {
        console.error('Invalid token:', error)
        router.push('/login')
      }
    } else {
      router.push('/login')
    }
  }, [router])

  // ALL HOOKS MUST BE AT THE TOP
  const { data: bandData, isLoading: bandLoading } = trpc.band.getBySlug.useQuery(
    { slug },
    { enabled: !!slug }
  )

  const { data: myBandsData, isLoading: myBandsLoading } = trpc.band.getMyBands.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  )

  const applyMutation = trpc.band.applyToJoin.useMutation({
    onSuccess: () => {
      showToast('Application submitted successfully!', 'success')
      router.push('/bands/my-bands')
    },
    onError: (error: any) => {
      try {
        if (error.message) {
          const parsedErrors = JSON.parse(error.message)
          if (Array.isArray(parsedErrors) && parsedErrors.length > 0) {
            showToast(parsedErrors[0].message, 'error')
            return
          }
        }
      } catch (e) {
        // If parsing fails, use the error message directly
      }
      showToast(error.message || 'Failed to submit application', 'error')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!userId || !bandData?.band) {
      showToast('Error submitting application', 'error')
      return
    }

    applyMutation.mutate({
      userId,
      bandId: bandData.band.id,
      notes,
    })
  }

  // NOW DO CONDITIONAL RENDERING
  if (bandLoading || myBandsLoading) {
    return (
      <PageWrapper variant="dashboard">
        <TopNav>
          <Flex justify="between">
            <Image 
              src="/logo.png" 
              alt="Band IT Logo" 
              width={200} 
              height={200}
              priority
            />
            <Button variant="ghost" size="sm" onClick={() => router.push('/bands')}>
              Back to Browse
            </Button>
          </Flex>
        </TopNav>
        <DashboardContainer>
          <Loading message="Loading..." />
        </DashboardContainer>
      </PageWrapper>
    )
  }

  if (!bandData?.band) {
    return (
      <PageWrapper variant="dashboard">
        <TopNav>
          <Flex justify="between">
            <Image 
              src="/logo.png" 
              alt="Band IT Logo" 
              width={200} 
              height={200}
              priority
            />
            <Button variant="ghost" size="sm" onClick={() => router.push('/bands')}>
              Back to Browse
            </Button>
          </Flex>
        </TopNav>
        <DashboardContainer>
          <Alert variant="danger">
            <Text>Band not found</Text>
          </Alert>
        </DashboardContainer>
      </PageWrapper>
    )
  }

  const band = bandData.band

  // Check if user is already a member
  const isAlreadyMember = myBandsData?.bands.some((b: any) => b.id === band.id)

  // Show error if already a member
  if (isAlreadyMember) {
    return (
      <PageWrapper variant="dashboard">
        <TopNav>
          <Flex justify="between">
            <Image 
              src="/logo.png" 
              alt="Band IT Logo" 
              width={200} 
              height={200}
              priority
            />
            <Button variant="ghost" size="sm" onClick={() => router.push('/bands')}>
              Back to Browse
            </Button>
          </Flex>
        </TopNav>
        <DashboardContainer>
          <Alert variant="warning">
            <Stack spacing="md">
              <Heading level={2}>Already a Member</Heading>
              <Text>You are already a member of {band.name}!</Text>
              <Button variant="primary" size="md" onClick={() => router.push(`/bands/${slug}`)}>
                View Band
              </Button>
            </Stack>
          </Alert>
        </DashboardContainer>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper variant="dashboard">
      <TopNav>
        <Flex justify="between">
          <Image 
            src="/logo.png" 
            alt="Band IT Logo" 
            width={200} 
            height={200}
            priority
          />
          <Button variant="ghost" size="sm" onClick={() => router.push('/bands')}>
            Back to Browse
          </Button>
        </Flex>
      </TopNav>

      <DashboardContainer>
        <div className="max-w-2xl mx-auto">
          <Stack spacing="xl">
            <Heading level={1}>Apply to Join {band.name}</Heading>

            <Card>
              <Stack spacing="md">
                <Heading level={3}>About the Band</Heading>
                <Text>{band.description}</Text>
              </Stack>
            </Card>

            <Card>
              <Stack spacing="md">
                <Heading level={3}>Membership Requirements</Heading>
                <Text>{band.membershipRequirements}</Text>
              </Stack>
            </Card>

            <Alert variant="info">
              <Text variant="small">
                Your application will be reviewed by the band's {band.whoCanApprove.map((r: string) => r.replace('_', ' ')).join(', ')}.
              </Text>
            </Alert>

            <form onSubmit={handleSubmit}>
              <Stack spacing="lg">
                <Textarea
                  label="Why do you want to join this band?"
                  required
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Tell the band why you'd be a great fit..."
                  rows={6}
                  helperText="At least 10 characters - Share your experience, skills, and what you hope to contribute"
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={applyMutation.isPending}
                  className="w-full"
                >
                  {applyMutation.isPending ? 'Submitting Application...' : 'Submit Application'}
                </Button>
              </Stack>
            </form>
          </Stack>
        </div>
      </DashboardContainer>
    </PageWrapper>
  )
}