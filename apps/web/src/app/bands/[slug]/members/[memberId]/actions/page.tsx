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
  PageWrapper,
  DashboardContainer,
  Flex,
  Card,
  Badge,
  Loading,
  Alert,
  BandSidebar,
  Modal,
} from '@/components/ui'
import { AppNav } from '@/components/AppNav'

const ROLE_ORDER = ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR', 'VOTING_MEMBER', 'OBSERVER']
const ROLE_LABELS: Record<string, string> = {
  FOUNDER: 'Founder',
  GOVERNOR: 'Governor',
  MODERATOR: 'Moderator',
  CONDUCTOR: 'Conductor',
  VOTING_MEMBER: 'Voting Member',
  OBSERVER: 'Observer',
}

const ROLE_COLORS: Record<string, 'success' | 'info' | 'warning' | 'neutral' | 'danger'> = {
  FOUNDER: 'success',
  GOVERNOR: 'info',
  MODERATOR: 'info',
  CONDUCTOR: 'warning',
  VOTING_MEMBER: 'neutral',
  OBSERVER: 'neutral',
}

export default function MemberActionsPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  const memberId = params.memberId as string
  const { showToast } = useToast()
  
  const [userId, setUserId] = useState<string | null>(null)
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [showRemoveModal, setShowRemoveModal] = useState(false)
  const [showNominateModal, setShowNominateModal] = useState(false)
  const [newRole, setNewRole] = useState<string>('')
  const [removalReason, setRemovalReason] = useState('')
  const [nominationReason, setNominationReason] = useState('')

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

  const { data: membersData } = trpc.band.getMembers.useQuery(
    { bandId: bandData?.band?.id || '' },
    { enabled: !!bandData?.band?.id }
  )

  const { data: profileData, isLoading: profileLoading, refetch: refetchProfile } = trpc.band.getMemberProfile.useQuery(
    { bandId: bandData?.band?.id || '', memberId },
    { enabled: !!bandData?.band?.id && !!memberId }
  )

  const changeRoleMutation = trpc.band.changeRole.useMutation({
    onSuccess: () => {
      showToast('Role updated successfully!', 'success')
      setShowRoleModal(false)
      setNewRole('')
      refetchProfile()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    }
  })

  const proposeRemovalMutation = trpc.band.proposeRemoval.useMutation({
    onSuccess: (data: { proposal: { id: string } }) => {
      showToast('Removal proposal created. Members will vote on it.', 'success')
      setShowRemoveModal(false)
      setRemovalReason('')
      router.push(`/bands/${slug}/proposals/${data.proposal.id}`)
    },
    onError: (error: { message: string }) => {
      showToast(error.message, 'error')
    }
  })

  const nominateFounderMutation = trpc.band.nominateAsFounder.useMutation({
    onSuccess: (data: { proposalId: string }) => {
      showToast('Founder nomination proposal created!', 'success')
      setShowNominateModal(false)
      setNominationReason('')
      router.push(`/bands/${slug}/proposals/${data.proposalId}`)
    },
    onError: (error: { message: string }) => {
      showToast(error.message, 'error')
    }
  })

  const handleChangeRole = () => {
    if (!profileData?.member || !newRole || !userId || !bandData?.band) return
    changeRoleMutation.mutate({
      bandId: bandData.band.id,
      memberId: profileData.member.id,
      newRole: newRole as any,
      userId,
    })
  }

  const handleProposeRemoval = () => {
    if (!profileData?.member || !removalReason || !userId || !bandData?.band) return
    proposeRemovalMutation.mutate({
      bandId: bandData.band.id,
      memberId: profileData.member.id,
      reason: removalReason,
      userId,
    })
  }

  const handleNominateAsFounder = () => {
    if (!profileData?.member || !nominationReason || !userId || !bandData?.band) return
    nominateFounderMutation.mutate({
      bandId: bandData.band.id,
      targetMemberId: profileData.member.id,
      reason: nominationReason,
      userId,
    })
  }

  const openRoleModal = () => {
    if (profileData?.member) {
      setNewRole(profileData.member.role)
      setShowRoleModal(true)
    }
  }

  if (bandLoading || profileLoading) {
    return (
      <PageWrapper variant="dashboard">
        <AppNav />
        <DashboardContainer>
          <Loading message="Loading member..." />
        </DashboardContainer>
      </PageWrapper>
    )
  }

  if (!bandData?.band) {
    return (
      <PageWrapper variant="dashboard">
        <AppNav />
        <DashboardContainer>
          <Alert variant="danger">
            <Text>Band not found</Text>
          </Alert>
        </DashboardContainer>
      </PageWrapper>
    )
  }

  if (!profileData?.member) {
    return (
      <PageWrapper variant="dashboard">
        <AppNav />
        <DashboardContainer>
          <Alert variant="danger">
            <Text>Member not found</Text>
          </Alert>
        </DashboardContainer>
      </PageWrapper>
    )
  }

  const band = bandData.band
  const member = profileData.member
  const whoCanChangeRoles = membersData?.whoCanChangeRoles || ['FOUNDER']
  
  const currentMember = band.members.find((m: any) => m.user.id === userId)
  const isMember = !!currentMember
  const canApprove = currentMember && band.whoCanApprove.includes(currentMember.role)
  const canChangeRoles = currentMember && whoCanChangeRoles.includes(currentMember.role)
  const canCreateProposals = currentMember && band.whoCanCreateProposals.includes(currentMember.role)
  const canNominateAsFounder = currentMember?.role === 'FOUNDER' &&
    member.role !== 'FOUNDER' &&
    member.userId !== userId

  // Check if user has any management permissions
  const canManage = canChangeRoles || canCreateProposals

  // Cannot manage self or founder
  const isManageable = member.userId !== userId && member.role !== 'FOUNDER'

  if (!canManage || !isManageable) {
    return (
      <PageWrapper variant="dashboard">
        <AppNav />
        <DashboardContainer>
          <Flex gap="md" align="start">
            <BandSidebar
              bandSlug={slug}
              bandName={bandData?.band?.name || ''}
              canApprove={canApprove}
              isMember={isMember}
            />
            <div className="flex-1 bg-white rounded-lg shadow p-8">
              <Alert variant="warning">
                <Text>You do not have permission to manage this member.</Text>
              </Alert>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/bands/${slug}/members`)}
                className="mt-4"
              >
                ← Back to Members
              </Button>
            </div>
          </Flex>
        </DashboardContainer>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper variant="dashboard">
      <AppNav />

      <DashboardContainer>
        <Flex gap="md" align="start">
          <BandSidebar
            bandSlug={slug}
            bandName={bandData?.band?.name || ''}
            canApprove={canApprove}
            isMember={isMember}
          />

          <div className="flex-1 bg-white rounded-lg shadow p-8">
            <Stack spacing="xl">
              {/* Breadcrumb */}
              <Flex gap="sm" className="text-gray-500 text-sm">
                <button 
                  onClick={() => router.push(`/bands/${slug}/members`)}
                  className="hover:text-blue-600"
                >
                  Members
                </button>
                <span>/</span>
                <span className="text-gray-700">{member.user.name}</span>
                <span>/</span>
                <span className="text-gray-700">Actions</span>
              </Flex>

              {/* Member Info Header */}
              <Card className="bg-gray-50">
                <Flex justify="between" align="center">
                  <Stack spacing="xs">
                    <Heading level={2}>{member.user.name}</Heading>
                    <Flex gap="sm" align="center">
                      <Badge variant={ROLE_COLORS[member.role]}>
                        {ROLE_LABELS[member.role]}
                      </Badge>
                    </Flex>
                    <Text variant="small" className="text-gray-400">
                      Member since {new Date(member.createdAt).toLocaleDateString()}
                    </Text>
                  </Stack>
                  <Stack spacing="xs" className="text-right">
                    <Text variant="small" className="text-gray-500">
                      {profileData.stats.tasksCompleted} tasks completed
                    </Text>
                    <Text variant="small" className="text-gray-500">
                      {profileData.stats.proposalsCreated} proposals created
                    </Text>
                  </Stack>
                </Flex>
              </Card>

              {/* Actions */}
              <Stack spacing="lg">
                <Heading level={3}>Member Actions</Heading>

                {/* Change Role */}
                {canChangeRoles && (
                  <Card>
                    <Flex justify="between" align="center">
                      <Stack spacing="xs">
                        <Text weight="semibold">Change Role</Text>
                        <Text variant="small" className="text-gray-500">
                          Update this member's role and permissions within the band.
                        </Text>
                      </Stack>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={openRoleModal}
                      >
                        Change Role
                      </Button>
                    </Flex>
                  </Card>
                )}

                {/* Nominate as Founder */}
                {canNominateAsFounder && (
                  <Card className="border-purple-100 bg-purple-50">
                    <Flex justify="between" align="center">
                      <Stack spacing="xs">
                        <Text weight="semibold" className="text-purple-800">Nominate as Co-Founder</Text>
                        <Text variant="small" className="text-purple-600">
                          Propose this member to become a co-founder. Requires unanimous approval from all current founders.
                        </Text>
                      </Stack>
                      <button
                        onClick={() => setShowNominateModal(true)}
                        className="px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        Nominate
                      </button>
                    </Flex>
                  </Card>
                )}

                {/* Future Actions Placeholder */}
                <Card className="bg-gray-50 border-dashed border-2 border-gray-200">
                  <Stack spacing="xs">
                    <Text weight="semibold" className="text-gray-400">Coming Soon</Text>
                    <Text variant="small" className="text-gray-400">
                      Additional actions like issuing warnings, creating development plans,
                      and adding private notes will be available here.
                    </Text>
                  </Stack>
                </Card>

                {/* Propose Removal - at the bottom, less prominent */}
                {canCreateProposals && (
                  <div className="pt-6 border-t border-gray-200">
                    <Card className="border-red-100 bg-red-50">
                      <Flex justify="between" align="center">
                        <Stack spacing="xs">
                          <Text weight="semibold" className="text-red-800">Propose Removal</Text>
                          <Text variant="small" className="text-red-600">
                            This will create a proposal that all band members will vote on. 
                            This action should only be used for serious concerns.
                          </Text>
                        </Stack>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setShowRemoveModal(true)}
                        >
                          Propose Removal
                        </Button>
                      </Flex>
                    </Card>
                  </div>
                )}
              </Stack>

              {/* Back Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/bands/${slug}/members`)}
              >
                ← Back to Members
              </Button>
            </Stack>
          </div>
        </Flex>
      </DashboardContainer>

      {/* Change Role Modal */}
      <Modal isOpen={showRoleModal} onClose={() => setShowRoleModal(false)}>
        <Stack spacing="lg">
          <Heading level={2}>Change Role</Heading>
          
          <Stack spacing="md">
            <Text>
              Change role for <strong>{member.user.name}</strong>
            </Text>

            <Stack spacing="xs">
              <Text variant="small" weight="semibold">Current Role</Text>
              <Badge variant={ROLE_COLORS[member.role]}>
                {ROLE_LABELS[member.role]}
              </Badge>
            </Stack>

            <Stack spacing="xs">
              <Text variant="small" weight="semibold">New Role</Text>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none transition focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {ROLE_ORDER.filter(r => r !== 'FOUNDER').map(role => (
                  <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                ))}
              </select>
            </Stack>

            <Alert variant="info">
              <Text variant="small">
                Role changes take effect immediately. The member will be notified.
              </Text>
            </Alert>

            <Flex gap="md" justify="end">
              <Button
                variant="ghost"
                onClick={() => setShowRoleModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleChangeRole}
                disabled={changeRoleMutation.isPending || newRole === member.role}
              >
                {changeRoleMutation.isPending ? 'Updating...' : 'Update Role'}
              </Button>
            </Flex>
          </Stack>
        </Stack>
      </Modal>

      {/* Propose Removal Modal */}
      <Modal isOpen={showRemoveModal} onClose={() => setShowRemoveModal(false)}>
        <Stack spacing="lg">
          <Heading level={2}>Propose Member Removal</Heading>

          <Stack spacing="md">
            <Alert variant="warning">
              <Text variant="small" weight="semibold">This will create a proposal</Text>
              <Text variant="small">
                Removing a member requires a band vote. A proposal will be created and all members will vote on it.
              </Text>
            </Alert>

            <Text>
              Propose removal of <strong>{member.user.name}</strong>
            </Text>

            <Stack spacing="xs">
              <Text variant="small" weight="semibold">Reason for Removal *</Text>
              <textarea
                value={removalReason}
                onChange={(e) => setRemovalReason(e.target.value)}
                placeholder="Please explain why this member should be removed..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none transition focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={4}
              />
              <Text variant="small" className="text-gray-500">
                Minimum 10 characters required
              </Text>
            </Stack>

            <Flex gap="md" justify="end">
              <Button
                variant="ghost"
                onClick={() => setShowRemoveModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleProposeRemoval}
                disabled={proposeRemovalMutation.isPending || removalReason.length < 10}
              >
                {proposeRemovalMutation.isPending ? 'Creating Proposal...' : 'Create Removal Proposal'}
              </Button>
            </Flex>
          </Stack>
        </Stack>
      </Modal>

      {/* Nominate as Founder Modal */}
      <Modal isOpen={showNominateModal} onClose={() => setShowNominateModal(false)}>
        <Stack spacing="lg">
          <Heading level={2}>Nominate as Co-Founder</Heading>

          <Stack spacing="md">
            <Alert variant="info">
              <Text variant="small" weight="semibold">Unanimous Approval Required</Text>
              <Text variant="small">
                Founder nominations require unanimous YES votes from ALL current founders.
                Any single NO vote will reject the nomination.
              </Text>
            </Alert>

            <Text>
              Nominate <strong>{member.user.name}</strong> to become a co-founder of this band.
            </Text>

            <Stack spacing="xs">
              <Text variant="small" weight="semibold">Reason for Nomination *</Text>
              <textarea
                value={nominationReason}
                onChange={(e) => setNominationReason(e.target.value)}
                placeholder="Explain why this member should become a co-founder..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none transition focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                rows={4}
              />
              <Text variant="small" className="text-gray-500">
                Minimum 10 characters required
              </Text>
            </Stack>

            <Flex gap="md" justify="end">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowNominateModal(false)
                  setNominationReason('')
                }}
              >
                Cancel
              </Button>
              <button
                onClick={handleNominateAsFounder}
                disabled={nominateFounderMutation.isPending || nominationReason.length < 10}
                className="px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {nominateFounderMutation.isPending ? 'Creating Proposal...' : 'Create Nomination Proposal'}
              </button>
            </Flex>
          </Stack>
        </Stack>
      </Modal>
    </PageWrapper>
  )
}