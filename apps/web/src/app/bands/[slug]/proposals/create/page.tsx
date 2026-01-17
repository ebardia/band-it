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
import { AppNav } from '@/components/AppNav'

const CAN_CREATE_PROPOSAL = ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR']

const PROPOSAL_TYPES = [
  { value: 'GENERAL', label: 'General', description: 'General decisions and discussions' },
  { value: 'BUDGET', label: 'Budget', description: 'Financial requests and spending' },
  { value: 'PROJECT', label: 'Project', description: 'New initiatives and projects' },
  { value: 'POLICY', label: 'Policy', description: 'Rules and policy changes' },
  { value: 'MEMBERSHIP', label: 'Membership', description: 'Member roles and changes' },
]

const PRIORITIES = [
  { value: 'LOW', label: 'Low', color: 'neutral' },
  { value: 'MEDIUM', label: 'Medium', color: 'info' },
  { value: 'HIGH', label: 'High', color: 'warning' },
  { value: 'URGENT', label: 'Urgent', color: 'danger' },
]

export default function CreateProposalPage() {
  const router = useRouter()
  const params = useParams()
  const { showToast } = useToast()
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
    onSuccess: (data) => {
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

    const proposalData = {
      bandId: bandData.band.id,
      userId,
      title,
      description,
      type: type as any,
      priority: priority as any,
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
    }

    // Store data for potential later use
    setPendingProposalData(proposalData)

    // Run integrity validation
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

  if (!canCreateProposal) {
    return (
      <>
        <AppNav />
        <BandLayout
          bandSlug={slug}
          bandName={band.name}
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
        pageTitle="Create Proposal"
        canApprove={canApprove}
        isMember={isMember}
        canCreateProposal={canCreateProposal}
        wide={true}
      >
        <Stack spacing="xl">
          {/* Voting Settings Info */}
          <Card>
            <Stack spacing="md">
              <Heading level={3}>Voting Settings</Heading>
              <Flex gap="lg">
                <Text variant="small">
                  <strong>Method:</strong> {band.votingMethod?.replace(/_/g, ' ') || 'Simple Majority'}
                </Text>
                <Text variant="small">
                  <strong>Period:</strong> {band.votingPeriodDays || 7} days
                </Text>
              </Flex>
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
                </Stack>
              </Card>

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

                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={handleGenerateDraft}
                    disabled={generateDraftMutation.isPending || title.length < 3}
                  >
                    {generateDraftMutation.isPending ? 'Generating...' : 'Generate Draft'}
                  </Button>
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
                        rows={3}
                      />

                      <Textarea
                        label="Expected Outcome"
                        value={expectedOutcome}
                        onChange={(e) => setExpectedOutcome(e.target.value)}
                        placeholder="What will be achieved if approved?"
                        rows={3}
                      />

                      <Textarea
                        label="Risks & Concerns"
                        value={risksAndConcerns}
                        onChange={(e) => setRisksAndConcerns(e.target.value)}
                        placeholder="What are potential downsides or risks?"
                        rows={3}
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

              {/* Submit */}
              <Flex gap="md">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={createMutation.isPending || validationMutation.isPending}
                >
                  {createMutation.isPending || validationMutation.isPending ? 'Creating...' : 'Create Proposal'}
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
        />

        <IntegrityWarningModal
          isOpen={showWarningModal}
          onClose={handleCancelWarning}
          onProceed={handleProceedWithWarnings}
          issues={validationIssues}
          isProceeding={createMutation.isPending}
        />
      </BandLayout>
    </>
  )
}
