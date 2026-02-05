'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { jwtDecode } from 'jwt-decode'
import {
  Heading,
  Text,
  Stack,
  Button,
  useToast,
  Flex,
  Card,
  Badge,
  Loading,
  Alert,
  BandLayout,
  Input,
  IntegrityBlockModal,
  IntegrityWarningModal,
} from '@/components/ui'
import { AppNav } from '@/components/AppNav'

// Roles that can create projects
const CAN_CREATE_PROJECT = ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR']

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
]

export default function ProposalProjectsPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  const proposalId = params.proposalId as string
  const { showToast } = useToast()
  const utils = trpc.useUtils()

  const [userId, setUserId] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)

  // Form state
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    priority: 'MEDIUM',
    startDate: '',
    targetDate: '',
    estimatedBudget: '',
    estimatedHours: '',
    deliverables: '',
    successCriteria: '',
    tags: '',
    leadId: '',
  })

  // Integrity Guard state
  const [validationIssues, setValidationIssues] = useState<any[]>([])
  const [showBlockModal, setShowBlockModal] = useState(false)
  const [showWarningModal, setShowWarningModal] = useState(false)
  const [pendingProjectData, setPendingProjectData] = useState<any>(null)

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

  const { data: bandData, isLoading: bandLoading } = trpc.band.getBySlug.useQuery(
    { slug },
    { enabled: !!slug }
  )

  const { data: proposalData, isLoading: proposalLoading } = trpc.proposal.getById.useQuery(
    { proposalId },
    { enabled: !!proposalId }
  )

  const { data: projectsData, isLoading: projectsLoading, refetch: refetchProjects } = trpc.project.getByProposal.useQuery(
    { proposalId },
    { enabled: !!proposalId }
  )

  const createProjectMutation = trpc.project.create.useMutation({
    onSuccess: () => {
      showToast('Project created!', 'success')
      setShowCreateForm(false)
      resetForm()
      refetchProjects()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    }
  })

  const aiSuggestMutation = trpc.project.aiSuggest.useMutation({
    onError: (error) => {
      showToast(error.message, 'error')
    }
  })

  // Integrity Guard validation mutation
  const validationMutation = trpc.validation.check.useMutation()

  const resetForm = () => {
    setNewProject({
      name: '',
      description: '',
      priority: 'MEDIUM',
      startDate: '',
      targetDate: '',
      estimatedBudget: '',
      estimatedHours: '',
      deliverables: '',
      successCriteria: '',
      tags: '',
      leadId: '',
    })
  }

  const handleCreateProject = async () => {
    if (!newProject.name.trim()) {
      showToast('Project name is required', 'error')
      return
    }

    const projectData = {
      proposalId,
      name: newProject.name.trim(),
      description: newProject.description.trim() || undefined,
      priority: newProject.priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
      startDate: newProject.startDate ? new Date(newProject.startDate).toISOString() : undefined,
      targetDate: newProject.targetDate ? new Date(newProject.targetDate).toISOString() : undefined,
      estimatedBudget: newProject.estimatedBudget ? parseFloat(newProject.estimatedBudget) : undefined,
      estimatedHours: newProject.estimatedHours ? parseInt(newProject.estimatedHours) : undefined,
      deliverables: newProject.deliverables.trim() || undefined,
      successCriteria: newProject.successCriteria.trim() || undefined,
      tags: newProject.tags ? newProject.tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
      leadId: newProject.leadId || undefined,
      userId: userId!,
    }

    // Store data for potential later use
    setPendingProjectData(projectData)

    // Run integrity validation
    try {
      const validation = await validationMutation.mutateAsync({
        entityType: 'Project',
        action: 'create',
        bandId: bandData?.band?.id || '',
        data: {
          name: newProject.name.trim(),
          description: newProject.description.trim(),
        },
        parentId: proposalId,
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

      // All clear - create project normally
      createProjectMutation.mutate(projectData)
    } catch (error) {
      // Validation failed - show error but don't create project
      console.error('Validation error:', error)
      showToast('Unable to validate content. Please try again.', 'error')
    }
  }

  // Handle proceeding with warnings
  const handleProceedWithWarnings = () => {
    if (!pendingProjectData) return

    createProjectMutation.mutate({
      ...pendingProjectData,
      proceedWithFlags: true,
      flagReasons: validationIssues.map(i => `${i.type}_mismatch`),
      flagDetails: validationIssues,
    })

    // Close modal and clear state
    setShowWarningModal(false)
    setValidationIssues([])
    setPendingProjectData(null)
  }

  // Handle canceling warning
  const handleCancelWarning = () => {
    setShowWarningModal(false)
    setValidationIssues([])
    setPendingProjectData(null)
  }

  // Handle closing block modal
  const handleCloseBlock = () => {
    setShowBlockModal(false)
    setValidationIssues([])
    setPendingProjectData(null)
    setShowCreateForm(false) // Close the form
  }

  const handleAISuggest = async () => {
    const result = await aiSuggestMutation.mutateAsync({
      proposalId,
      userId: userId!,
    })

    // Refresh AI usage tracker
    utils.aiUsage.invalidate()

    if (result.suggestions && result.suggestions.length > 0) {
      let created = 0
      const skipped: string[] = []

      for (const suggestion of result.suggestions) {
        // Validate each AI suggestion against the proposal scope
        try {
          const validation = await validationMutation.mutateAsync({
            entityType: 'Project',
            action: 'create',
            bandId: bandData?.band?.id || '',
            data: {
              name: suggestion.name,
              description: suggestion.description,
            },
            parentId: proposalId,
          })

          if (!validation.canProceed) {
            skipped.push(suggestion.name)
            continue
          }
        } catch {
          // If validation fails (e.g. AI unavailable), allow the project through
        }

        await createProjectMutation.mutateAsync({
          proposalId,
          name: suggestion.name,
          description: suggestion.description,
          orderIndex: suggestion.order,
          userId: userId!,
          aiGenerated: true,
        })
        created++
      }

      if (created > 0) {
        showToast(`Created ${created} projects from AI suggestions`, 'success')
      }
      if (skipped.length > 0) {
        showToast(`Skipped ${skipped.length} suggestions that didn't align with the proposal`, 'warning')
      }
      if (created === 0 && skipped.length === 0) {
        showToast('No new suggestions were generated', 'info')
      }
    } else {
      showToast('All necessary projects already exist - no new suggestions needed', 'info')
    }
  }

  if (bandLoading || proposalLoading || projectsLoading) {
    return (
      <>
        <AppNav />
        <BandLayout
          bandSlug={slug}
          bandName="Loading..."
          pageTitle="Projects"
          isMember={false}
          wide={true}
        >
          <Loading message="Loading projects..." />
        </BandLayout>
      </>
    )
  }

  if (!bandData?.band || !proposalData?.proposal) {
    return (
      <>
        <AppNav />
        <BandLayout
          bandSlug={slug}
          bandName=""
          pageTitle="Projects"
          isMember={false}
          wide={true}
        >
          <Alert variant="danger">
            <Text>Proposal not found</Text>
          </Alert>
        </BandLayout>
      </>
    )
  }

  const band = bandData.band
  const proposal = proposalData.proposal
  const projects = projectsData?.projects || []
  const currentMember = band.members.find((m: any) => m.user.id === userId)
  const canCreateProject = currentMember && CAN_CREATE_PROJECT.includes(currentMember.role)
  const canApprove = currentMember && band.whoCanApprove.includes(currentMember.role)
  const isMember = !!currentMember
  const isApproved = proposal.status === 'APPROVED'

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PLANNING':
        return <Badge variant="info">Planning</Badge>
      case 'ACTIVE':
        return <Badge variant="success">Active</Badge>
      case 'ON_HOLD':
        return <Badge variant="warning">On Hold</Badge>
      case 'COMPLETED':
        return <Badge variant="success">Completed</Badge>
      case 'CANCELLED':
        return <Badge variant="danger">Cancelled</Badge>
      default:
        return <Badge variant="neutral">{status}</Badge>
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'LOW':
        return <Badge variant="neutral">Low</Badge>
      case 'MEDIUM':
        return <Badge variant="info">Medium</Badge>
      case 'HIGH':
        return <Badge variant="warning">High</Badge>
      case 'URGENT':
        return <Badge variant="danger">Urgent</Badge>
      default:
        return <Badge variant="neutral">{priority}</Badge>
    }
  }

  return (
    <>
      <AppNav />
      <BandLayout
        bandSlug={slug}
        bandName={band.name}
        bandImageUrl={band.imageUrl}
        pageTitle="Projects"
        canApprove={canApprove}
        isMember={isMember}
        canCreateProposal={canCreateProject}
        wide={true}
        action={
          isApproved && canCreateProject ? (
            <Flex gap="sm">
              <Button
                variant="primary"
                size="md"
                onClick={() => setShowCreateForm(true)}
                disabled={showCreateForm}
              >
                + Create Project
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={handleAISuggest}
                disabled={aiSuggestMutation.isPending || createProjectMutation.isPending}
              >
                {aiSuggestMutation.isPending ? 'Generating...' : 'AI Suggest'}
              </Button>
            </Flex>
          ) : undefined
        }
      >
        <Stack spacing="xl">
          {/* Header */}
          <Stack spacing="sm">
            <Text variant="small" className="text-gray-500">
              <button
                onClick={() => router.push(`/bands/${slug}/proposals/${proposalId}`)}
                className="hover:text-blue-600"
              >
                Back to Proposal
              </button>
            </Text>
            <Text color="muted">From proposal: {proposal.title}</Text>
            <Flex gap="sm">
              <Badge variant={isApproved ? 'success' : 'warning'}>
                Proposal: {proposal.status}
              </Badge>
            </Flex>
          </Stack>

          {/* Not Approved Warning */}
          {!isApproved && (
            <Alert variant="warning">
              <Text>This proposal has not been approved yet. Projects can only be created for approved proposals.</Text>
            </Alert>
          )}

          {/* Create Form */}
          {showCreateForm && (
            <Card>
              <Stack spacing="lg">
                <Heading level={3}>Create New Project</Heading>

                {/* Basic Info */}
                <Stack spacing="md">
                  <Input
                    label="Project Name *"
                    value={newProject.name}
                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                    placeholder="e.g., Site Preparation"
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={newProject.description}
                      onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                      placeholder="Describe what this project will accomplish..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none transition focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Priority
                    </label>
                    <select
                      value={newProject.priority}
                      onChange={(e) => setNewProject({ ...newProject, priority: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none transition focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {PRIORITY_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </Stack>

                {/* Timeline */}
                <Stack spacing="md">
                  <Text weight="semibold">Timeline</Text>
                  <Flex gap="md">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={newProject.startDate}
                        onChange={(e) => setNewProject({ ...newProject, startDate: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none transition focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Target Date
                      </label>
                      <input
                        type="date"
                        value={newProject.targetDate}
                        onChange={(e) => setNewProject({ ...newProject, targetDate: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none transition focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </Flex>
                </Stack>

                {/* Budget & Effort */}
                <Stack spacing="md">
                  <Text weight="semibold">Budget & Effort</Text>
                  <Flex gap="md">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Estimated Budget ($)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={newProject.estimatedBudget}
                        onChange={(e) => setNewProject({ ...newProject, estimatedBudget: e.target.value })}
                        placeholder="0.00"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none transition focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Estimated Hours
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={newProject.estimatedHours}
                        onChange={(e) => setNewProject({ ...newProject, estimatedHours: e.target.value })}
                        placeholder="0"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none transition focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </Flex>
                </Stack>

                {/* Deliverables & Success */}
                <Stack spacing="md">
                  <Text weight="semibold">Deliverables & Success Criteria</Text>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Deliverables
                    </label>
                    <textarea
                      value={newProject.deliverables}
                      onChange={(e) => setNewProject({ ...newProject, deliverables: e.target.value })}
                      placeholder="What will this project produce?"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none transition focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={2}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Success Criteria
                    </label>
                    <textarea
                      value={newProject.successCriteria}
                      onChange={(e) => setNewProject({ ...newProject, successCriteria: e.target.value })}
                      placeholder="How will we know this project is complete?"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none transition focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={2}
                    />
                  </div>
                </Stack>

                {/* Tags & Lead */}
                <Stack spacing="md">
                  <Text weight="semibold">Organization</Text>
                  <Flex gap="md">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tags (comma separated)
                      </label>
                      <input
                        type="text"
                        value={newProject.tags}
                        onChange={(e) => setNewProject({ ...newProject, tags: e.target.value })}
                        placeholder="e.g., planning, research, permits"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none transition focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Project Lead
                      </label>
                      <select
                        value={newProject.leadId}
                        onChange={(e) => setNewProject({ ...newProject, leadId: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none transition focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select a lead (optional)</option>
                        {band.members.map((member: any) => (
                          <option key={member.user.id} value={member.user.id}>
                            {member.user.name} ({member.role})
                          </option>
                        ))}
                      </select>
                    </div>
                  </Flex>
                </Stack>

                {/* Actions */}
                <Flex gap="sm">
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleCreateProject}
                    disabled={createProjectMutation.isPending || validationMutation.isPending}
                  >
                    {createProjectMutation.isPending || validationMutation.isPending ? 'Creating...' : 'Create Project'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="md"
                    onClick={() => {
                      setShowCreateForm(false)
                      resetForm()
                    }}
                  >
                    Cancel
                  </Button>
                </Flex>
              </Stack>
            </Card>
          )}

          {/* Projects List */}
          <Stack spacing="lg">
            <Heading level={2}>Projects ({projects.length})</Heading>

            {projects.length > 0 ? (
              <Stack spacing="md">
                {projects.map((project: any) => (
                  <Card key={project.id}>
                    <Flex justify="between">
                      <Stack spacing="sm">
                        <Flex gap="sm" align="center">
                          <Heading level={3}>{project.name}</Heading>
                          {project.aiGenerated && (
                            <Badge variant="info">AI</Badge>
                          )}
                        </Flex>
                        {project.description && (
                          <Text color="muted">{project.description}</Text>
                        )}
                        <Flex gap="sm" className="flex-wrap">
                          {getStatusBadge(project.status)}
                          {getPriorityBadge(project.priority)}
                          {project.lead && (
                            <Badge variant="neutral">Lead: {project.lead.name}</Badge>
                          )}
                        </Flex>
                        <Flex gap="md" className="flex-wrap">
                          <Text variant="small" className="text-gray-500">
                            Created by {project.createdBy.name}
                          </Text>
                          {project.startDate && (
                            <Text variant="small" className="text-gray-500">
                              Start: {new Date(project.startDate).toLocaleDateString()}
                            </Text>
                          )}
                          {project.targetDate && (
                            <Text variant="small" className="text-gray-500">
                              Target: {new Date(project.targetDate).toLocaleDateString()}
                            </Text>
                          )}
                          {project.estimatedHours && (
                            <Text variant="small" className="text-gray-500">
                              Est: {project.estimatedHours}h
                            </Text>
                          )}
                        </Flex>
                      </Stack>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => router.push(`/bands/${slug}/projects/${project.id}`)}
                      >
                        View Details
                      </Button>
                    </Flex>
                  </Card>
                ))}
              </Stack>
            ) : (
              <Alert variant="info">
                <Text>
                  {isApproved
                    ? 'No projects yet. Create one or use AI to suggest projects based on the proposal.'
                    : 'Projects will be available once the proposal is approved.'
                  }
                </Text>
              </Alert>
            )}
          </Stack>
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
          isProceeding={createProjectMutation.isPending}
        />
      </BandLayout>
    </>
  )
}
