'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { jwtDecode } from 'jwt-decode'
import { MIN_MEMBERS_TO_ACTIVATE, REQUIRE_PAYMENT_TO_ACTIVATE } from '@band-it/shared'
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
  DashboardContainer,
  Flex,
  Box,
  FileUpload,
  Loading
} from '@/components/ui'
import { TemplateSelector } from '@/components/onboarding'
import { AppNav } from '@/components/AppNav'

export default function CreateBandPage() {
  return (
    <Suspense fallback={<PageWrapper variant="dashboard"><Loading message="Loading..." /></PageWrapper>}>
      <CreateBandContent />
    </Suspense>
  )
}

function CreateBandContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { showToast } = useToast()
  const [userId, setUserId] = useState<string | null>(null)
  const parentBandId = searchParams.get('parentBandId')
  const parentBandName = searchParams.get('parentBandName')
  const templateFromUrl = searchParams.get('template')
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(templateFromUrl)

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
    // Governance settings
    votingMethod: 'SIMPLE_MAJORITY' as 'SIMPLE_MAJORITY' | 'SUPERMAJORITY_66' | 'SUPERMAJORITY_75' | 'UNANIMOUS',
    votingPeriodDays: 7,
    quorumPercentage: 50,
  })
  const [whoCanApprove, setWhoCanApprove] = useState<string[]>(['FOUNDER'])
  const [whoCanCreateProposals, setWhoCanCreateProposals] = useState<string[]>(['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR'])
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [uploadedImageName, setUploadedImageName] = useState<string | null>(null)

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

  const uploadFileMutation = trpc.file.upload.useMutation()

  // Fetch template defaults when template is selected
  const { data: templateDefaults } = trpc.onboarding.getTemplateDefaults.useQuery(
    { templateId: selectedTemplate! },
    { enabled: !!selectedTemplate }
  )

  // Apply template defaults to form
  useEffect(() => {
    if (templateDefaults) {
      setFormData(prev => ({
        ...prev,
        mission: templateDefaults.suggestedMission || prev.mission,
        values: templateDefaults.suggestedValues?.join(', ') || prev.values,
        votingMethod: templateDefaults.suggestedVotingMethod || prev.votingMethod,
        votingPeriodDays: templateDefaults.suggestedVotingPeriodDays || prev.votingPeriodDays,
      }))
    }
  }, [templateDefaults])

  const handleImageUpload = async (fileData: { fileName: string; mimeType: string; base64Data: string }) => {
    if (!userId) return

    setIsUploadingImage(true)
    try {
      const result = await uploadFileMutation.mutateAsync({
        ...fileData,
        userId,
        category: 'IMAGE',
      })
      setFormData(prev => ({ ...prev, imageUrl: result.file.url }))
      setUploadedImageName(result.file.originalName)
      showToast('Image uploaded', 'success')
    } catch (error: any) {
      showToast(error.message || 'Failed to upload image', 'error')
    } finally {
      setIsUploadingImage(false)
    }
  }

  const removeImage = () => {
    setFormData(prev => ({ ...prev, imageUrl: '' }))
    setUploadedImageName(null)
  }

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
      whoCanCreateProposals: whoCanCreateProposals as any,
      parentBandId: parentBandId || undefined,
      templateId: selectedTemplate || undefined,
    })
  }

  const handleRoleToggle = (role: string) => {
    if (whoCanApprove.includes(role)) {
      setWhoCanApprove(whoCanApprove.filter(r => r !== role))
    } else {
      setWhoCanApprove([...whoCanApprove, role])
    }
  }

  const handleProposalRoleToggle = (role: string) => {
    if (whoCanCreateProposals.includes(role)) {
      setWhoCanCreateProposals(whoCanCreateProposals.filter(r => r !== role))
    } else {
      setWhoCanCreateProposals([...whoCanCreateProposals, role])
    }
  }

  const roles = ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR', 'VOTING_MEMBER', 'OBSERVER']

  const votingMethods = [
    { value: 'SIMPLE_MAJORITY', label: 'Simple Majority (>50%)', description: 'Proposals pass when more than half vote yes' },
    { value: 'SUPERMAJORITY_66', label: 'Supermajority (>66%)', description: 'Proposals need two-thirds approval' },
    { value: 'SUPERMAJORITY_75', label: 'Supermajority (>75%)', description: 'Proposals need three-quarters approval' },
    { value: 'UNANIMOUS', label: 'Unanimous (100%)', description: 'Everyone must agree for proposals to pass' },
  ]

  return (
    <PageWrapper variant="dashboard">
      <AppNav />

      <DashboardContainer>
        <div className="max-w-3xl mx-auto">
          <Stack spacing="xl">
            <Heading level={1}>{parentBandId ? 'Create a Sub-band' : 'Create a New Band'}</Heading>
            <Text variant="muted">
              {parentBandId
                ? 'Fill out the information below to create your sub-band. You\'ll be the founder!'
                : 'Fill out the information below to create your band. You\'ll be the founder!'}
            </Text>

            {(MIN_MEMBERS_TO_ACTIVATE > 1 || REQUIRE_PAYMENT_TO_ACTIVATE) && !parentBandId && (
              <Alert variant="info">
                <Text variant="small">
                  {REQUIRE_PAYMENT_TO_ACTIVATE
                    ? `Your band will start in PENDING status. Once you have ${MIN_MEMBERS_TO_ACTIVATE} active member${MIN_MEMBERS_TO_ACTIVATE === 1 ? '' : 's'} and set up payment, it will become ACTIVE.`
                    : `Your band will start in PENDING status. Once you have ${MIN_MEMBERS_TO_ACTIVATE} active member${MIN_MEMBERS_TO_ACTIVATE === 1 ? '' : 's'}, it will automatically become ACTIVE.`
                  }
                </Text>
              </Alert>
            )}

            {parentBandId && (
              <Alert variant="info">
                <Stack spacing="xs">
                  <Text variant="small" weight="semibold">Creating a Sub-band</Text>
                  <Text variant="small">
                    {parentBandName
                      ? `This band will be created as a sub-band under "${parentBandName}".`
                      : 'This band will be created as a sub-band under the selected Big Band.'
                    }
                  </Text>
                </Stack>
              </Alert>
            )}

            {/* Template Selection */}
            <Box>
              <Text weight="semibold" className="mb-2">What kind of group are you organizing?</Text>
              <Text variant="small" color="muted" className="mb-4">
                Choose a template to get tailored guidance and suggested settings.
              </Text>
              <TemplateSelector
                selectedTemplate={selectedTemplate}
                onSelect={setSelectedTemplate}
              />
            </Box>

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
                  <Text variant="small" color="muted" className="mb-3">Select the roles that can approve membership applications</Text>
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

                {/* Governance Policy Section */}
                <div className="border-t border-gray-200 pt-6 mt-2">
                  <Heading level={2} className="mb-4">Governance Policy</Heading>
                  <Text color="muted" className="mb-6">Define how decisions are made in your band</Text>

                  <Stack spacing="lg">
                    <Box>
                      <Text variant="small" weight="semibold" className="mb-2">Voting Method</Text>
                      <Text variant="small" color="muted" className="mb-3">How should proposals be approved?</Text>
                      <Stack spacing="sm">
                        {votingMethods.map((method) => (
                          <label key={method.value} className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                            <input
                              type="radio"
                              name="votingMethod"
                              value={method.value}
                              checked={formData.votingMethod === method.value}
                              onChange={(e) => setFormData({ ...formData, votingMethod: e.target.value as any })}
                              className="w-4 h-4 mt-0.5"
                            />
                            <div>
                              <Text variant="small" weight="semibold">{method.label}</Text>
                              <Text variant="small" color="muted">{method.description}</Text>
                            </div>
                          </label>
                        ))}
                      </Stack>
                    </Box>

                    <Flex gap="md">
                      <Box className="flex-1">
                        <Input
                          label="Voting Period (Days)"
                          type="number"
                          min={1}
                          max={30}
                          value={formData.votingPeriodDays}
                          onChange={(e) => setFormData({ ...formData, votingPeriodDays: parseInt(e.target.value) || 7 })}
                          helperText="How long members have to vote (1-30 days)"
                        />
                      </Box>
                      <Box className="flex-1">
                        <Input
                          label="Quorum (%)"
                          type="number"
                          min={1}
                          max={100}
                          value={formData.quorumPercentage}
                          onChange={(e) => setFormData({ ...formData, quorumPercentage: parseInt(e.target.value) || 50 })}
                          helperText="Minimum % of members that must vote"
                        />
                      </Box>
                    </Flex>

                    <Box>
                      <Text variant="small" weight="semibold" className="mb-2">Who Can Create Proposals?</Text>
                      <Text variant="small" color="muted" className="mb-3">Select the roles that can submit proposals for voting</Text>
                      <Stack spacing="sm">
                        {roles.map((role) => (
                          <label key={role} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={whoCanCreateProposals.includes(role)}
                              onChange={() => handleProposalRoleToggle(role)}
                              className="w-4 h-4"
                            />
                            <Text variant="small">{role.replace('_', ' ')}</Text>
                          </label>
                        ))}
                      </Stack>
                    </Box>
                  </Stack>
                </div>

                <Input
                  label="Postal Code (Optional)"
                  type="text"
                  value={formData.zipcode}
                  onChange={(e) => setFormData({ ...formData, zipcode: e.target.value })}
                  placeholder="e.g. 12345, SW1A 1AA"
                  maxLength={10}
                  helperText="Leave blank if your band covers a large area"
                />

                <Box>
                  <Text variant="small" weight="semibold" className="mb-2">Band Image (Optional)</Text>
                  {formData.imageUrl ? (
                    <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                      <img src={formData.imageUrl} alt="Band" className="w-16 h-16 object-cover rounded-lg" />
                      <div className="flex-1">
                        <Text variant="small">{uploadedImageName || 'Image uploaded'}</Text>
                      </div>
                      <Button type="button" variant="danger" size="sm" onClick={removeImage}>
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <FileUpload
                      onUpload={handleImageUpload}
                      isUploading={isUploadingImage}
                      label=""
                      description="Upload a logo or image for your band"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      maxSizeMB={5}
                    />
                  )}
                </Box>

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