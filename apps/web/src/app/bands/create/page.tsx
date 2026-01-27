'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { jwtDecode } from 'jwt-decode'
import {
  Heading,
  Text,
  Stack,
  Input,
  Textarea,
  Button,
  useToast,
  Alert,
  PageWrapper,
  TopNav,
  DashboardContainer,
  Flex,
  Box
} from '@/components/ui'
import Image from 'next/image'

export default function CreateBandPage() {
  const router = useRouter()
  const { showToast } = useToast()
  const [userId, setUserId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    mission: '',
    values: '',
    skillsLookingFor: '',
    whatMembersWillLearn: '',
    membershipRequirements: '',
    zipcode: '',
    imageUrl: '',
  })
  const [whoCanApprove, setWhoCanApprove] = useState<string[]>(['FOUNDER'])

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

  const createBandMutation = trpc.band.create.useMutation({
    onSuccess: (data) => {
      showToast('Band created successfully!', 'success')
      router.push('/bands/my-bands')
    },
    onError: (error: any) => {
      try {
        // Parse the error message which contains JSON string
        if (error.message) {
          const parsedErrors = JSON.parse(error.message)
          if (Array.isArray(parsedErrors) && parsedErrors.length > 0) {
            showToast(parsedErrors[0].message, 'error')
            return
          }
        }
      } catch (e) {
        // If parsing fails, fall back to generic message
      }
      showToast(error.message || 'Please check all required fields', 'error')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!userId) {
      showToast('You must be logged in to create a band', 'error')
      return
    }

    if (whoCanApprove.length === 0) {
      showToast('Please select at least one role that can approve members', 'error')
      return
    }

    createBandMutation.mutate({
      userId,
      ...formData,
      whoCanApprove: whoCanApprove as any,
    })
  }

  const handleRoleToggle = (role: string) => {
    if (whoCanApprove.includes(role)) {
      setWhoCanApprove(whoCanApprove.filter(r => r !== role))
    } else {
      setWhoCanApprove([...whoCanApprove, role])
    }
  }

  const roles = ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR', 'VOTING_MEMBER', 'OBSERVER']

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
          <Button variant="ghost" size="sm" onClick={() => router.push('/user-dashboard')}>
            Back to Dashboard
          </Button>
        </Flex>
      </TopNav>

      <DashboardContainer>
        <div className="max-w-3xl mx-auto">
          <Stack spacing="xl">
            <Heading level={1}>Create a New Band</Heading>
            <Text variant="muted">Fill out the information below to create your band. You'll be the founder!</Text>

            <Alert variant="info">
              <Text variant="small">
                Your band will start in PENDING status. Once you have 3 active members, it will automatically become ACTIVE.
              </Text>
            </Alert>

            <form onSubmit={handleSubmit}>
              <Stack spacing="lg">
                <Input
                  label="Band Name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="The Rockin' Rebels"
                  data-guide="band-name"
                />

                <Textarea
                  label="Description"
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Tell people about your band..."
                  rows={4}
                  helperText="At least 10 characters - What kind of music do you play? What's your band's story?"
                  data-guide="band-description"
                />

                <Textarea
                  label="Mission Statement"
                  required
                  value={formData.mission}
                  onChange={(e) => setFormData({ ...formData, mission: e.target.value })}
                  placeholder="Our mission is to..."
                  rows={3}
                  helperText="At least 10 characters - What is your band trying to achieve?"
                  data-guide="band-mission"
                />

                <Textarea
                  label="Band Values"
                  required
                  value={formData.values}
                  onChange={(e) => setFormData({ ...formData, values: e.target.value })}
                  placeholder="Creativity, Collaboration, Community"
                  rows={2}
                  helperText="Separate with commas"
                />

                <Textarea
                  label="Skills We're Looking For"
                  required
                  value={formData.skillsLookingFor}
                  onChange={(e) => setFormData({ ...formData, skillsLookingFor: e.target.value })}
                  placeholder="Guitar, Drums, Vocals, Marketing"
                  rows={2}
                  helperText="Separate with commas - these will be matched with potential members"
                />

                <Textarea
                  label="What Members Will Learn"
                  required
                  value={formData.whatMembersWillLearn}
                  onChange={(e) => setFormData({ ...formData, whatMembersWillLearn: e.target.value })}
                  placeholder="Performance skills, Music theory, Band management"
                  rows={2}
                  helperText="Separate with commas - these will be matched with members' development goals"
                />

                <Textarea
                  label="Membership Requirements"
                  required
                  value={formData.membershipRequirements}
                  onChange={(e) => setFormData({ ...formData, membershipRequirements: e.target.value })}
                  placeholder="We're looking for committed musicians who can practice weekly..."
                  rows={3}
                  helperText="At least 10 characters - What are the requirements to join your band?"
                />

                <Box>
                  <Text variant="small" weight="semibold" className="mb-2">Who Can Approve New Members?</Text>
                  <Text variant="small" variant="muted" className="mb-3">Select the roles that can approve membership applications</Text>
                  <Stack spacing="sm">
                    {roles.map((role) => (
                      <label key={role} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={whoCanApprove.includes(role)}
                          onChange={() => handleRoleToggle(role)}
                          className="w-4 h-4"
                        />
                        <Text variant="small">{role.replace('_', ' ')}</Text>
                      </label>
                    ))}
                  </Stack>
                </Box>

                <Input
                  label="Zipcode (Optional)"
                  type="text"
                  value={formData.zipcode}
                  onChange={(e) => setFormData({ ...formData, zipcode: e.target.value })}
                  placeholder="12345"
                  maxLength={5}
                  pattern="[0-9]{5}"
                  helperText="Leave blank if your band covers a large area"
                />

                <Input
                  label="Band Image URL (Optional)"
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://example.com/band-logo.png"
                  helperText="A link to your band's logo or image"
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={createBandMutation.isPending}
                  className="w-full"
                  data-guide="band-create-button"
                >
                  {createBandMutation.isPending ? 'Creating Band...' : 'Create Band'}
                </Button>
              </Stack>
            </form>
          </Stack>
        </div>
      </DashboardContainer>
    </PageWrapper>
  )
}