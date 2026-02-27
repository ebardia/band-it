'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
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
  Flex,
  Card,
  Alert,
  Loading,
  BandLayout,
  Badge,
  IntegrityBlockModal,
  IntegrityWarningModal,
} from '@/components/ui'
import { OnboardingHint } from '@/components/onboarding'
import { AppNav } from '@/components/AppNav'
import { TrainAIButton } from '@/components/ai'

const CAN_CREATE_PROPOSAL = ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR']
const CAN_CREATE_GOVERNANCE = ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR']

const PROPOSAL_TYPES = [
  { value: 'GENERAL', label: 'General', description: 'General decisions and discussions' },
  { value: 'BUDGET', label: 'Budget', description: 'Financial requests and spending' },
  { value: 'PROJECT', label: 'Project', description: 'New initiatives and projects' },
  { value: 'POLICY', label: 'Policy', description: 'Rules and policy changes' },
  { value: 'MEMBERSHIP', label: 'Membership', description: 'Member roles and changes' },
]

const EXECUTION_TYPES = [
  { value: 'PROJECT', label: 'Project', description: 'Creates a project when approved (default behavior)' },
  { value: 'GOVERNANCE', label: 'Governance', description: 'Auto-executes changes to band settings when approved' },
  // ACTION temporarily hidden - not fully implemented yet
  // { value: 'ACTION', label: 'Action', description: 'Auto-triggers routine tasks when approved' },
  { value: 'RESOLUTION', label: 'Resolution', description: 'Just records the decision, nothing executes' },
]

const PRIORITIES = [
  { value: 'LOW', label: 'Low', color: 'neutral' },
  { value: 'MEDIUM', label: 'Medium', color: 'info' },
  { value: 'HIGH', label: 'High', color: 'warning' },
  { value: 'URGENT', label: 'Urgent', color: 'danger' },
]

const BUCKET_TYPES = ['OPERATING', 'PROJECT', 'RESTRICTED', 'UNRESTRICTED', 'COMMITMENT']
const BUCKET_VISIBILITIES = ['MEMBERS', 'OFFICERS_ONLY']
const BUCKET_POLICIES = ['TREASURER_ONLY', 'OFFICER_TIER']

interface FinanceEffect {
  type: string
  payload: Record<string, any>
  order?: number
}

export default function CreateProposalPage() {
  const router = useRouter()
  const params = useParams()
  const { showToast } = useToast()
  const utils = trpc.useUtils()
  const slug = params.slug as string
  const [userId, setUserId] = useState<string | null>(null)

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<string>('GENERAL')
  const [priority, setPriority] = useState<string>('MEDIUM')
  const [problemStatement, setProblemStatement] = useState('')
  const [expectedOutcome, setExpectedOutcome] = useState('')
  const [risksAndConcerns, setRisksAndConcerns] = useState('')
  const [budgetRequested, setBudgetRequested] = useState('')
  const [budgetBreakdown, setBudgetBreakdown] = useState('')
  const [fundingSource, setFundingSource] = useState('')
  const [proposedStartDate, setProposedStartDate] = useState('')
  const [proposedEndDate, setProposedEndDate] = useState('')
  const [milestones, setMilestones] = useState('')
  const [externalLinks, setExternalLinks] = useState('')
  const [aiContext, setAiContext] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [allowEarlyClose, setAllowEarlyClose] = useState(false)
  const [useCustomVotingPeriod, setUseCustomVotingPeriod] = useState(false)
  const [customVotingPeriodValue, setCustomVotingPeriodValue] = useState('')
  const [customVotingPeriodUnit, setCustomVotingPeriodUnit] = useState<'hours' | 'days'>('days')

  // Execution type & effects (for governance proposals)
  const [executionType, setExecutionType] = useState<string>('PROJECT')
  const [executionSubtype, setExecutionSubtype] = useState<string>('')
  const [financeEffects, setFinanceEffects] = useState<FinanceEffect[]>([])
  const [showEffectsBuilder, setShowEffectsBuilder] = useState(false)
  const [showMemberSelect, setShowMemberSelect] = useState<'ADD_TREASURER' | 'REMOVE_TREASURER' | null>(null)

  // Integrity Guard state
  const [validationIssues, setValidationIssues] = useState<any[]>([])
  const [showBlockModal, setShowBlockModal] = useState(false)
  const [showWarningModal, setShowWarningModal] = useState(false)
  const [pendingProposalData, setPendingProposalData] = useState<any>(null)

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

  const { data: bandData, isLoading } = trpc.band.getBySlug.useQuery(
    { slug },
    { enabled: !!slug }
  )

  const createMutation = trpc.proposal.create.useMutation({
    onSuccess: (data: any) => {
      showToast('Proposal created successfully!', 'success')
      router.push(`/bands/${slug}/proposals/${data.proposal.id}`)
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
      } catch (e) {}
      showToast(error.message || 'Failed to create proposal', 'error')
    },
  })

  // Integrity Guard validation mutation
  const validationMutation = trpc.validation.check.useMutation()

  const generateDraftMutation = trpc.proposal.generateDraft.useMutation({
    onSuccess: (data) => {
      showToast('Draft generated! Review and customize.', 'success')
      setDescription(data.draft.description)
      setProblemStatement(data.draft.problemStatement)
      setExpectedOutcome(data.draft.expectedOutcome)
      setRisksAndConcerns(data.draft.risksAndConcerns)
      setBudgetBreakdown(data.draft.budgetBreakdown)
      setMilestones(data.draft.milestones)
      setShowAdvanced(true)
      // Refresh AI usage tracker
      utils.aiUsage.invalidate()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  const handleGenerateDraft = () => {
    if (!title || title.length < 3) {
      showToast('Please enter a title first (at least 3 characters)', 'error')
      return
    }
    generateDraftMutation.mutate({
      title,
      type: type as any,
      context: aiContext || undefined,
      bandId: bandData?.band?.id,
      bandName: bandData?.band?.name,
      userId: userId || undefined,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!userId || !bandData?.band) {
      showToast('Error creating proposal', 'error')
      return
    }

    const linksArray = externalLinks
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0)

    // Calculate custom voting period in hours if set
    let customVotingPeriodHours: number | undefined = undefined
    if (useCustomVotingPeriod && customVotingPeriodValue) {
      const value = parseInt(customVotingPeriodValue, 10)
      if (!isNaN(value) && value > 0) {
        customVotingPeriodHours = customVotingPeriodUnit === 'hours' ? value : value * 24
      }
    }

    const proposalData = {
      bandId: bandData.band.id,
      userId,
      title,
      description,
      type: type as any,
      priority: priority as any,
      executionType: executionType as any,
      executionSubtype: executionSubtype || undefined,
      effects: financeEffects.length > 0 ? financeEffects : undefined,
      problemStatement: problemStatement || undefined,
      expectedOutcome: expectedOutcome || undefined,
      risksAndConcerns: risksAndConcerns || undefined,
      budgetRequested: budgetRequested ? parseFloat(budgetRequested) : undefined,
      budgetBreakdown: budgetBreakdown || undefined,
      fundingSource: fundingSource || undefined,
      proposedStartDate: proposedStartDate || undefined,
      proposedEndDate: proposedEndDate || undefined,
      milestones: milestones || undefined,
      externalLinks: linksArray.length > 0 ? linksArray : undefined,
      allowEarlyClose,
      customVotingPeriodHours,
    }

    // Store data for potential later use
    setPendingProposalData(proposalData)

    // Skip integrity validation for GOVERNANCE proposals (administrative actions)
    if (executionType === 'GOVERNANCE') {
      createMutation.mutate(proposalData)
      return
    }

    // Run integrity validation for non-governance proposals
    try {
      const validation = await validationMutation.mutateAsync({
        entityType: 'Proposal',
        action: 'create',
        bandId: bandData.band.id,
        data: {
          title,
          description,
        },
      })

      if (!validation.canProceed) {
        // BLOCK - show block modal, cannot proceed
        setValidationIssues(validation.issues)
        setShowBlockModal(true)
        return
      }

      if (validation.issues.length > 0) {
        // FLAG - show warning modal, user can choose to proceed
        setValidationIssues(validation.issues)
        setShowWarningModal(true)
        return
      }

      // All clear - create proposal normally
      createMutation.mutate(proposalData)
    } catch (error) {
      // Validation failed - show error but don't create proposal
      console.error('Validation error:', error)
      showToast('Unable to validate content. Please try again.', 'error')
    }
  }

  // Handle proceeding with warnings
  const handleProceedWithWarnings = () => {
    if (!pendingProposalData) return

    createMutation.mutate({
      ...pendingProposalData,
      proceedWithFlags: true,
      flagReasons: validationIssues.map(i => `${i.type}_mismatch`),
      flagDetails: validationIssues,
    })

    // Close modal and clear state
    setShowWarningModal(false)
    setValidationIssues([])
    setPendingProposalData(null)
  }

  // Handle canceling warning
  const handleCancelWarning = () => {
    setShowWarningModal(false)
    setValidationIssues([])
    setPendingProposalData(null)
  }

  // Handle closing block modal
  const handleCloseBlock = () => {
    setShowBlockModal(false)
    setValidationIssues([])
    setPendingProposalData(null)
  }

  if (isLoading) {
    return (
      <>
        <AppNav />
        <BandLayout
          bandSlug={slug}
          bandName="Loading..."
          pageTitle="Create Proposal"
          isMember={false}
          wide={true}
        >
          <Loading message="Loading..." />
        </BandLayout>
      </>
    )
  }

  if (!bandData?.band) {
    return (
      <>
        <AppNav />
        <BandLayout
          bandSlug={slug}
          bandName=""
          pageTitle="Create Proposal"
          isMember={false}
          wide={true}
        >
          <Alert variant="danger">
            <Text>Band not found</Text>
          </Alert>
        </BandLayout>
      </>
    )
  }

  const band = bandData.band
  const currentMember = band.members.find((m: any) => m.user.id === userId)
  const canApprove = currentMember && band.whoCanApprove.includes(currentMember.role)
  const isMember = !!currentMember
  const canCreateProposal = currentMember && CAN_CREATE_PROPOSAL.includes(currentMember.role)
  const canCreateGovernance = currentMember && CAN_CREATE_GOVERNANCE.includes(currentMember.role)

  if (!canCreateProposal) {
    return (
      <>
        <AppNav />
        <BandLayout
          bandSlug={slug}
          bandName={band.name}
        bandImageUrl={band.imageUrl}
          pageTitle="Create Proposal"
          canApprove={canApprove}
          isMember={isMember}
          wide={true}
        >
          <Alert variant="danger">
            <Text>You do not have permission to create proposals in this band.</Text>
          </Alert>
        </BandLayout>
      </>
    )
  }

  return (
    <>
      <AppNav />
      <BandLayout
        bandSlug={slug}
        bandName={band.name}
        bandImageUrl={band.imageUrl}
        pageTitle="Create Proposal"
        canApprove={canApprove}
        isMember={isMember}
        canCreateProposal={canCreateProposal}
        wide={true}
      >
        <Stack spacing="xl">
          {/* Onboarding Hint */}
          {userId && band.id && (
            <OnboardingHint
              bandId={band.id}
              userId={userId}
              relevantSteps={[6]}
            />
          )}

          {/* Voting Settings Info */}
          <Card>
            <Stack spacing="md">
              <Heading level={3}>Voting Settings</Heading>
              <Flex gap="lg">
                <Text variant="small">
                  <strong>Method:</strong> {band.votingMethod?.replace(/_/g, ' ') || 'Simple Majority'}
                </Text>
                <Text variant="small">
                  <strong>Default Period:</strong> {band.votingPeriodHours
                    ? `${band.votingPeriodHours} hours`
                    : `${band.votingPeriodDays || 7} days`}
                </Text>
              </Flex>

              {/* Custom Voting Period */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useCustomVotingPeriod}
                  onChange={(e) => {
                    setUseCustomVotingPeriod(e.target.checked)
                    if (!e.target.checked) {
                      setCustomVotingPeriodValue('')
                    }
                  }}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <Text variant="small">
                  Use custom voting period for this proposal
                </Text>
              </label>

              {useCustomVotingPeriod && (
                <Flex gap="sm" align="end">
                  <div className="flex-1 max-w-32">
                    <Input
                      label="Duration"
                      type="number"
                      min={1}
                      max={customVotingPeriodUnit === 'hours' ? 720 : 30}
                      value={customVotingPeriodValue}
                      onChange={(e) => setCustomVotingPeriodValue(e.target.value)}
                      placeholder={customVotingPeriodUnit === 'hours' ? '24' : '7'}
                    />
                  </div>
                  <div className="flex gap-1 pb-1">
                    <Button
                      type="button"
                      variant={customVotingPeriodUnit === 'hours' ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => setCustomVotingPeriodUnit('hours')}
                    >
                      Hours
                    </Button>
                    <Button
                      type="button"
                      variant={customVotingPeriodUnit === 'days' ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => setCustomVotingPeriodUnit('days')}
                    >
                      Days
                    </Button>
                  </div>
                </Flex>
              )}

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowEarlyClose}
                  onChange={(e) => setAllowEarlyClose(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <Text variant="small">
                  Allow early close when all members have voted
                </Text>
              </label>
            </Stack>
          </Card>

          <form onSubmit={handleSubmit}>
            <Stack spacing="xl">
              {/* Basic Info */}
              <Card>
                <Stack spacing="lg">
                  <Heading level={3}>Basic Information</Heading>

                  <Input
                    label="Proposal Title"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="What do you want to propose?"
                    helperText="At least 5 characters"
                  />

                  {/* Type Selection */}
                  <Stack spacing="sm">
                    <Text variant="small" weight="semibold">Proposal Type</Text>
                    <Flex gap="sm" className="flex-wrap">
                      {PROPOSAL_TYPES.map((t) => (
                        <Button
                          key={t.value}
                          type="button"
                          variant={type === t.value ? 'primary' : 'secondary'}
                          size="sm"
                          onClick={() => setType(t.value)}
                        >
                          {t.label}
                        </Button>
                      ))}
                    </Flex>
                    <Text variant="small" color="muted">
                      {PROPOSAL_TYPES.find(t => t.value === type)?.description}
                    </Text>
                  </Stack>

                  {/* Priority Selection */}
                  <Stack spacing="sm">
                    <Text variant="small" weight="semibold">Priority</Text>
                    <Flex gap="sm">
                      {PRIORITIES.map((p) => (
                        <Button
                          key={p.value}
                          type="button"
                          variant={priority === p.value ? 'primary' : 'ghost'}
                          size="sm"
                          onClick={() => setPriority(p.value)}
                        >
                          {p.label}
                        </Button>
                      ))}
                    </Flex>
                  </Stack>

                  {/* Execution Type Selection */}
                  {canCreateGovernance && (
                    <Stack spacing="sm">
                      <Text variant="small" weight="semibold">What happens when approved?</Text>
                      <Flex gap="sm" className="flex-wrap">
                        {EXECUTION_TYPES.map((et) => (
                          <Button
                            key={et.value}
                            type="button"
                            variant={executionType === et.value ? 'primary' : 'secondary'}
                            size="sm"
                            onClick={() => {
                              setExecutionType(et.value)
                              if (et.value !== 'GOVERNANCE') {
                                setExecutionSubtype('')
                                setFinanceEffects([])
                                setShowEffectsBuilder(false)
                              }
                            }}
                          >
                            {et.label}
                          </Button>
                        ))}
                      </Flex>
                      <Text variant="small" color="muted">
                        {EXECUTION_TYPES.find(et => et.value === executionType)?.description}
                      </Text>
                    </Stack>
                  )}
                </Stack>
              </Card>

              {/* Governance Effects Builder */}
              {executionType === 'GOVERNANCE' && canCreateGovernance && (
                <Card>
                  <Stack spacing="lg">
                    <Stack spacing="sm">
                      <Heading level={3}>Governance Configuration</Heading>
                      <Text variant="small" color="muted">
                        Configure what changes will be automatically applied when this proposal is approved.
                      </Text>
                    </Stack>

                    {/* Subtype Selection */}
                    <Stack spacing="sm">
                      <Text variant="small" weight="semibold">Governance Type</Text>
                      <Flex gap="sm" className="flex-wrap">
                        <Button
                          type="button"
                          variant={executionSubtype === 'FINANCE_BUCKET_GOVERNANCE_V1' ? 'primary' : 'secondary'}
                          size="sm"
                          onClick={() => {
                            setExecutionSubtype('FINANCE_BUCKET_GOVERNANCE_V1')
                            setShowEffectsBuilder(true)
                          }}
                        >
                          Finance & Buckets
                        </Button>
                      </Flex>
                    </Stack>

                    {/* Finance Effects Builder */}
                    {executionSubtype === 'FINANCE_BUCKET_GOVERNANCE_V1' && showEffectsBuilder && (
                      <Stack spacing="md">
                        <Text variant="small" weight="semibold">Effects (actions that will execute on approval)</Text>

                        {/* List existing effects */}
                        {financeEffects.length > 0 && (
                          <Stack spacing="sm">
                            {financeEffects.map((effect, index) => {
                              // Get friendly description
                              const getEffectDescription = () => {
                                switch (effect.type) {
                                  case 'ADD_TREASURER': {
                                    const member = band.members.find((m: any) => m.user.id === effect.payload.userId)
                                    return `Add ${member?.user.name || 'Unknown'} as Treasurer`
                                  }
                                  case 'REMOVE_TREASURER': {
                                    const member = band.members.find((m: any) => m.user.id === effect.payload.userId)
                                    return `Remove ${member?.user.name || 'Unknown'} as Treasurer`
                                  }
                                  case 'CREATE_BUCKET':
                                    return `Create bucket "${effect.payload.bucket?.name}" (${effect.payload.bucket?.type})`
                                  case 'UPDATE_BUCKET':
                                    return `Update bucket "${effect.payload.name || effect.payload.bucketId}"`
                                  case 'DEACTIVATE_BUCKET':
                                    return `Deactivate bucket "${effect.payload.bucketId}"`
                                  case 'SET_BUCKET_MANAGEMENT_POLICY':
                                    return `Set management policy to ${effect.payload.policy === 'TREASURER_ONLY' ? 'Treasurer Only' : 'Officer Tier'}`
                                  default:
                                    return effect.type.replace(/_/g, ' ')
                                }
                              }

                              return (
                                <Card key={index} className="bg-gray-50">
                                  <Flex justify="between" align="center">
                                    <Flex gap="sm" align="center">
                                      <Badge variant="info">{effect.type.replace(/_/g, ' ')}</Badge>
                                      <Text variant="small">{getEffectDescription()}</Text>
                                    </Flex>
                                    <Button
                                      type="button"
                                      variant="danger"
                                      size="sm"
                                      onClick={() => {
                                        setFinanceEffects(financeEffects.filter((_, i) => i !== index))
                                      }}
                                    >
                                      Remove
                                    </Button>
                                  </Flex>
                                </Card>
                              )
                            })}
                          </Stack>
                        )}

                        {/* Add Effect Buttons */}
                        <Stack spacing="sm">
                          <Text variant="small" color="muted">Add an effect:</Text>
                          <Flex gap="sm" className="flex-wrap">
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => setShowMemberSelect('ADD_TREASURER')}
                            >
                              + Add Treasurer
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => setShowMemberSelect('REMOVE_TREASURER')}
                            >
                              - Remove Treasurer
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                const name = prompt('Bucket name:')
                                if (!name) return
                                const typeOptions = BUCKET_TYPES.join(', ')
                                const bucketType = prompt(`Bucket type (${typeOptions}):`)?.toUpperCase()
                                if (!bucketType || !BUCKET_TYPES.includes(bucketType)) {
                                  showToast('Invalid bucket type', 'error')
                                  return
                                }
                                const visibilityOptions = BUCKET_VISIBILITIES.join(', ')
                                const visibility = prompt(`Visibility (${visibilityOptions}):`)?.toUpperCase() || 'MEMBERS'
                                setFinanceEffects([...financeEffects, {
                                  type: 'CREATE_BUCKET',
                                  payload: { bucket: { name, type: bucketType, visibility } },
                                  order: financeEffects.length + 1
                                }])
                              }}
                            >
                              + Create Bucket
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                const policyOptions = BUCKET_POLICIES.join(', ')
                                const policy = prompt(`Set management policy (${policyOptions}):`)?.toUpperCase()
                                if (!policy || !BUCKET_POLICIES.includes(policy)) {
                                  showToast('Invalid policy', 'error')
                                  return
                                }
                                setFinanceEffects([...financeEffects, {
                                  type: 'SET_BUCKET_MANAGEMENT_POLICY',
                                  payload: { policy },
                                  order: financeEffects.length + 1
                                }])
                              }}
                            >
                              Set Policy
                            </Button>
                          </Flex>

                          {/* Member Selection for Treasurer */}
                          {showMemberSelect && (
                            <Card className="border-2 border-blue-200 bg-blue-50">
                              <Stack spacing="sm">
                                <Text weight="semibold">
                                  {showMemberSelect === 'ADD_TREASURER' ? 'Select member to add as treasurer:' : 'Select member to remove as treasurer:'}
                                </Text>
                                <Flex gap="sm" className="flex-wrap">
                                  {band.members.map((m: any) => (
                                    <Button
                                      key={m.user.id}
                                      type="button"
                                      variant="secondary"
                                      size="sm"
                                      onClick={() => {
                                        setFinanceEffects([...financeEffects, {
                                          type: showMemberSelect,
                                          payload: { userId: m.user.id },
                                          order: financeEffects.length + 1
                                        }])
                                        setShowMemberSelect(null)
                                      }}
                                    >
                                      {m.user.name} ({m.role})
                                    </Button>
                                  ))}
                                </Flex>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setShowMemberSelect(null)}
                                >
                                  Cancel
                                </Button>
                              </Stack>
                            </Card>
                          )}
                        </Stack>

                        {financeEffects.length === 0 && (
                          <Alert variant="warning">
                            <Text>Add at least one effect for this governance proposal.</Text>
                          </Alert>
                        )}
                      </Stack>
                    )}
                  </Stack>
                </Card>
              )}

              {/* AI Assistant */}
              <Card>
                <Stack spacing="md">
                  <Flex justify="between">
                    <Heading level={3}>AI Assistant</Heading>
                    <Badge variant="info">Beta</Badge>
                  </Flex>
                  <Text variant="small" color="muted">
                    Let AI help you structure your proposal based on best practices.
                  </Text>

                  <Textarea
                    label="Additional Context (optional)"
                    value={aiContext}
                    onChange={(e) => setAiContext(e.target.value)}
                    placeholder="Provide any additional context to help generate a better draft..."
                    rows={2}
                  />

                  <Flex gap="sm" align="center">
                    <Button
                      type="button"
                      variant="secondary"
                      size="md"
                      onClick={handleGenerateDraft}
                      disabled={generateDraftMutation.isPending || title.length < 3}
                    >
                      {generateDraftMutation.isPending ? 'Generating...' : 'Generate Draft'}
                    </Button>
                    <TrainAIButton
                      bandId={band?.id || ''}
                      userId={userId || ''}
                      userRole={currentMember?.role || ''}
                      contextOperation="proposal_draft"
                      placeholder="e.g., 'Include budget estimates' or 'Focus on member benefits'"
                    />
                  </Flex>
                </Stack>
              </Card>

              {/* Description */}
              <Card>
                <Stack spacing="lg">
                  <Heading level={3}>Description</Heading>

                  <Textarea
                    label="Proposal Description"
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your proposal in detail..."
                    rows={6}
                    helperText="At least 20 characters - Be thorough so members can make informed decisions"
                  />
                </Stack>
              </Card>

              {/* Advanced Fields Toggle */}
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                {showAdvanced ? 'Hide Advanced Fields' : 'Show Advanced Fields'}
              </Button>

              {showAdvanced && (
                <>
                  {/* Problem & Outcome */}
                  <Card>
                    <Stack spacing="lg">
                      <Heading level={3}>Problem & Outcome</Heading>

                      <Textarea
                        label="Problem Statement"
                        value={problemStatement}
                        onChange={(e) => setProblemStatement(e.target.value)}
                        placeholder="What problem or opportunity does this address?"
                        rows={6}
                      />

                      <Textarea
                        label="Expected Outcome"
                        value={expectedOutcome}
                        onChange={(e) => setExpectedOutcome(e.target.value)}
                        placeholder="What will be achieved if approved?"
                        rows={6}
                      />

                      <Textarea
                        label="Risks & Concerns"
                        value={risksAndConcerns}
                        onChange={(e) => setRisksAndConcerns(e.target.value)}
                        placeholder="What are potential downsides or risks?"
                        rows={6}
                      />
                    </Stack>
                  </Card>

                  {/* Budget (show if BUDGET type or always in advanced) */}
                  <Card>
                    <Stack spacing="lg">
                      <Heading level={3}>Budget (if applicable)</Heading>

                      <Input
                        label="Budget Requested ($)"
                        type="number"
                        value={budgetRequested}
                        onChange={(e) => setBudgetRequested(e.target.value)}
                        placeholder="0.00"
                      />

                      <Textarea
                        label="Budget Breakdown"
                        value={budgetBreakdown}
                        onChange={(e) => setBudgetBreakdown(e.target.value)}
                        placeholder="• Item 1: $X&#10;• Item 2: $X&#10;• Total: $X"
                        rows={4}
                      />

                      <Input
                        label="Funding Source"
                        value={fundingSource}
                        onChange={(e) => setFundingSource(e.target.value)}
                        placeholder="Where will the funds come from?"
                      />
                    </Stack>
                  </Card>

                  {/* Timeline */}
                  <Card>
                    <Stack spacing="lg">
                      <Heading level={3}>Timeline (if applicable)</Heading>

                      <Flex gap="md">
                        <Input
                          label="Proposed Start Date"
                          type="date"
                          value={proposedStartDate}
                          onChange={(e) => setProposedStartDate(e.target.value)}
                        />
                        <Input
                          label="Proposed End Date"
                          type="date"
                          value={proposedEndDate}
                          onChange={(e) => setProposedEndDate(e.target.value)}
                        />
                      </Flex>

                      <Textarea
                        label="Milestones"
                        value={milestones}
                        onChange={(e) => setMilestones(e.target.value)}
                        placeholder="• Week 1: First milestone&#10;• Week 2: Second milestone"
                        rows={4}
                      />
                    </Stack>
                  </Card>

                  {/* External Links */}
                  <Card>
                    <Stack spacing="lg">
                      <Heading level={3}>Supporting Links</Heading>

                      <Textarea
                        label="External Links"
                        value={externalLinks}
                        onChange={(e) => setExternalLinks(e.target.value)}
                        placeholder="https://example.com/doc1&#10;https://example.com/doc2"
                        rows={3}
                        helperText="One URL per line"
                      />
                    </Stack>
                  </Card>
                </>
              )}

              {/* Submission Info */}
              {band.requireProposalReview ? (
                <Alert variant="info">
                  <Text>
                    This band requires proposals to be reviewed by a moderator before they go to voting.
                    You can save as draft to continue editing later, or submit for review when ready.
                  </Text>
                </Alert>
              ) : (
                <Alert variant="warning">
                  <Text>
                    <strong>Note:</strong> This band does not require proposal review.
                    When you submit, voting will open immediately for {
                      useCustomVotingPeriod && customVotingPeriodValue
                        ? `${customVotingPeriodValue} ${customVotingPeriodUnit}`
                        : band.votingPeriodHours
                          ? `${band.votingPeriodHours} hours`
                          : `${band.votingPeriodDays || 7} days`
                    }.
                  </Text>
                </Alert>
              )}

              {/* Submit */}
              <Flex gap="md">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={createMutation.isPending || validationMutation.isPending}
                >
                  {createMutation.isPending || validationMutation.isPending
                    ? 'Submitting...'
                    : band.requireProposalReview
                      ? 'Submit for Review'
                      : 'Submit & Open Voting'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  disabled={createMutation.isPending}
                  onClick={() => {
                    if (!userId || !bandData?.band) return
                    const linksArray = externalLinks.split('\n').map(l => l.trim()).filter(l => l.length > 0)
                    // Calculate custom voting period in hours if set
                    let draftCustomVotingPeriodHours: number | undefined = undefined
                    if (useCustomVotingPeriod && customVotingPeriodValue) {
                      const value = parseInt(customVotingPeriodValue, 10)
                      if (!isNaN(value) && value > 0) {
                        draftCustomVotingPeriodHours = customVotingPeriodUnit === 'hours' ? value : value * 24
                      }
                    }
                    createMutation.mutate({
                      bandId: bandData.band.id,
                      userId,
                      title,
                      description,
                      type: type as 'GENERAL' | 'BUDGET' | 'PROJECT' | 'POLICY' | 'MEMBERSHIP',
                      priority: priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
                      executionType: executionType as 'PROJECT' | 'GOVERNANCE' | 'ACTION' | 'RESOLUTION',
                      executionSubtype: executionSubtype || undefined,
                      effects: financeEffects.length > 0 ? financeEffects : undefined,
                      problemStatement: problemStatement || undefined,
                      expectedOutcome: expectedOutcome || undefined,
                      risksAndConcerns: risksAndConcerns || undefined,
                      budgetRequested: budgetRequested ? parseFloat(budgetRequested) : undefined,
                      budgetBreakdown: budgetBreakdown || undefined,
                      fundingSource: fundingSource || undefined,
                      proposedStartDate: proposedStartDate || undefined,
                      proposedEndDate: proposedEndDate || undefined,
                      milestones: milestones || undefined,
                      externalLinks: linksArray.length > 0 ? linksArray : undefined,
                      saveAsDraft: true,
                      allowEarlyClose,
                      customVotingPeriodHours: draftCustomVotingPeriodHours,
                    })
                  }}
                >
                  Save as Draft
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="lg"
                  onClick={() => router.push(`/bands/${slug}/proposals`)}
                >
                  Cancel
                </Button>
              </Flex>
            </Stack>
          </form>
        </Stack>

        {/* Integrity Guard Modals */}
        <IntegrityBlockModal
          isOpen={showBlockModal}
          onClose={handleCloseBlock}
          issues={validationIssues}
          bandId={band?.id}
          userId={userId || undefined}
          userRole={currentMember?.role}
        />

        <IntegrityWarningModal
          isOpen={showWarningModal}
          onClose={handleCancelWarning}
          onProceed={handleProceedWithWarnings}
          issues={validationIssues}
          isProceeding={createMutation.isPending}
          bandId={band?.id}
          userId={userId || undefined}
          userRole={currentMember?.role}
        />
      </BandLayout>
    </>
  )
}
