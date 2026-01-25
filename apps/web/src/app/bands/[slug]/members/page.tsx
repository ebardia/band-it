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

export default function BandMembersPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  const { showToast } = useToast()

  const [userId, setUserId] = useState<string | null>(null)
  const [selectedMember, setSelectedMember] = useState<any>(null)
  const [showProfileModal, setShowProfileModal] = useState(false)

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

  const { data: membersData, isLoading: membersLoading } = trpc.band.getMembers.useQuery(
    { bandId: bandData?.band?.id || '' },
    { enabled: !!bandData?.band?.id }
  )

  const { data: profileData, isLoading: profileLoading } = trpc.band.getMemberProfile.useQuery(
    { bandId: bandData?.band?.id || '', memberId: selectedMember?.id || '' },
    { enabled: !!bandData?.band?.id && !!selectedMember?.id && showProfileModal }
  )

  const openProfileModal = (member: any) => {
    setSelectedMember(member)
    setShowProfileModal(true)
  }

  const closeProfileModal = () => {
    setShowProfileModal(false)
    setSelectedMember(null)
  }

  const goToMemberActions = (memberId: string) => {
    closeProfileModal()
    router.push(`/bands/${slug}/members/${memberId}/actions`)
  }

  if (bandLoading || membersLoading) {
    return (
      <>
        <AppNav />
        <BandLayout
          bandSlug={slug}
          bandName="Loading..."
          pageTitle="Members"
          isMember={false}
          wide={true}
        >
          <Loading message="Loading members..." />
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
          pageTitle="Members"
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
  const members = membersData?.members || []
  const whoCanChangeRoles = membersData?.whoCanChangeRoles || ['FOUNDER']

  const currentMember = band.members.find((m: any) => m.user.id === userId)
  const isMember = !!currentMember
  const canApprove = currentMember && band.whoCanApprove.includes(currentMember.role)
  const canAccessAdminTools = currentMember && ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR'].includes(currentMember.role)
  const canManageMembers = currentMember && (
    whoCanChangeRoles.includes(currentMember.role) ||
    band.whoCanCreateProposals.includes(currentMember.role)
  )

  // Sort members by role order
  const sortedMembers = [...members].sort((a, b) => {
    return ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role)
  })

  // Group by role for summary
  const roleCounts = members.reduce((acc: Record<string, number>, m: any) => {
    acc[m.role] = (acc[m.role] || 0) + 1
    return acc
  }, {})

  return (
    <>
      <AppNav />
      <BandLayout
        bandSlug={slug}
        bandName={band.name}
        pageTitle="Members"
        canApprove={canApprove}
        isMember={isMember}
        canAccessAdminTools={canAccessAdminTools}
        wide={true}
        action={
          isMember ? (
            <Button
              variant="primary"
              size="md"
              onClick={() => router.push(`/bands/${slug}/invite`)}
            >
              + Invite Member
            </Button>
          ) : undefined
        }
      >
        <Stack spacing="xl">
          {/* Role Summary */}
          <Flex gap="sm" className="flex-wrap">
            {ROLE_ORDER.filter(role => roleCounts[role]).map(role => (
              <Badge key={role} variant={ROLE_COLORS[role]}>
                {ROLE_LABELS[role]}: {roleCounts[role]}
              </Badge>
            ))}
          </Flex>

          {/* Members List */}
          <Stack spacing="md">
            {sortedMembers.map((member: any) => (
              <Card key={member.id} className="hover:shadow-md transition">
                <Flex justify="between" align="start">
                  <Stack spacing="sm" className="flex-1">
                    <Flex gap="sm" align="center">
                      <Text weight="semibold">{member.user.name}</Text>
                      <Badge variant={ROLE_COLORS[member.role]}>
                        {ROLE_LABELS[member.role]}
                      </Badge>
                      {member.status !== 'ACTIVE' && (
                        <Badge variant="warning">{member.status}</Badge>
                      )}
                    </Flex>
                    <Text variant="small" className="text-gray-500">
                      {member.user.email}
                    </Text>
                    {member.stats && (
                      <Flex gap="md" className="text-gray-500">
                        <Text variant="small">
                          {member.stats.tasksCompleted} tasks completed
                        </Text>
                        <Text variant="small">
                          {member.stats.proposalsCreated} proposals
                        </Text>
                        <Text variant="small">
                          {member.stats.votesCount} votes
                        </Text>
                      </Flex>
                    )}
                    <Text variant="small" className="text-gray-400">
                      Joined {new Date(member.createdAt).toLocaleDateString()}
                    </Text>
                  </Stack>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openProfileModal(member)}
                  >
                    View Profile
                  </Button>
                </Flex>
              </Card>
            ))}
          </Stack>

          {members.length === 0 && (
            <Alert variant="info">
              <Text>No members found.</Text>
            </Alert>
          )}
        </Stack>

        {/* Member Profile Modal */}
        <Modal isOpen={showProfileModal} onClose={closeProfileModal}>
          <Stack spacing="lg">
            <Heading level={2}>Member Profile</Heading>

            {profileLoading ? (
              <Loading message="Loading profile..." />
            ) : profileData?.member ? (
              <Stack spacing="md">
                <Stack spacing="xs">
                  <Text weight="semibold" className="text-lg">{profileData.member.user.name}</Text>
                  <Badge variant={ROLE_COLORS[profileData.member.role]}>
                    {ROLE_LABELS[profileData.member.role]}
                  </Badge>
                </Stack>

                <Card className="bg-gray-50">
                  <Stack spacing="sm">
                    <Heading level={4}>Contribution Stats</Heading>
                    <div className="grid grid-cols-2 gap-4">
                      <Stack spacing="xs">
                        <Text variant="small" className="text-gray-500">Tasks Completed</Text>
                        <Text weight="semibold">{profileData.stats.tasksCompleted}</Text>
                      </Stack>
                      <Stack spacing="xs">
                        <Text variant="small" className="text-gray-500">Tasks In Progress</Text>
                        <Text weight="semibold">{profileData.stats.tasksInProgress}</Text>
                      </Stack>
                      <Stack spacing="xs">
                        <Text variant="small" className="text-gray-500">Proposals Created</Text>
                        <Text weight="semibold">{profileData.stats.proposalsCreated}</Text>
                      </Stack>
                      <Stack spacing="xs">
                        <Text variant="small" className="text-gray-500">Proposals Approved</Text>
                        <Text weight="semibold">{profileData.stats.proposalsApproved}</Text>
                      </Stack>
                      <Stack spacing="xs">
                        <Text variant="small" className="text-gray-500">Votes Cast</Text>
                        <Text weight="semibold">{profileData.stats.votesCount}</Text>
                      </Stack>
                      <Stack spacing="xs">
                        <Text variant="small" className="text-gray-500">Projects Led</Text>
                        <Text weight="semibold">{profileData.stats.projectsLed}</Text>
                      </Stack>
                    </div>
                  </Stack>
                </Card>

                {profileData.member.user.strengths?.length > 0 && (
                  <Stack spacing="xs">
                    <Text weight="semibold">Strengths</Text>
                    <Flex gap="sm" className="flex-wrap">
                      {profileData.member.user.strengths.map((s: string, i: number) => (
                        <Badge key={i} variant="neutral">{s}</Badge>
                      ))}
                    </Flex>
                  </Stack>
                )}

                {profileData.member.user.passions?.length > 0 && (
                  <Stack spacing="xs">
                    <Text weight="semibold">Passions</Text>
                    <Flex gap="sm" className="flex-wrap">
                      {profileData.member.user.passions.map((p: string, i: number) => (
                        <Badge key={i} variant="info">{p}</Badge>
                      ))}
                    </Flex>
                  </Stack>
                )}

                {profileData.recentActivity.tasks.length > 0 && (
                  <Stack spacing="xs">
                    <Text weight="semibold">Recent Tasks</Text>
                    {profileData.recentActivity.tasks.map((task: any) => (
                      <Flex key={task.id} justify="between" className="text-sm py-1">
                        <Text variant="small">{task.name}</Text>
                        <Badge variant={task.status === 'COMPLETED' ? 'success' : 'neutral'}>
                          {task.status}
                        </Badge>
                      </Flex>
                    ))}
                  </Stack>
                )}

                <Text variant="small" className="text-gray-400">
                  Member since {new Date(profileData.member.createdAt).toLocaleDateString()}
                </Text>

                {/* Manage Member Link - only for authorized users, not for self, not for founder */}
                {canManageMembers &&
                 selectedMember?.userId !== userId &&
                 selectedMember?.role !== 'FOUNDER' && (
                  <div className="pt-4 border-t border-gray-200">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => goToMemberActions(selectedMember.id)}
                    >
                      Manage Member
                    </Button>
                  </div>
                )}
              </Stack>
            ) : (
              <Alert variant="danger">
                <Text>Could not load member profile</Text>
              </Alert>
            )}

            <Button variant="ghost" onClick={closeProfileModal}>
              Close
            </Button>
          </Stack>
        </Modal>
      </BandLayout>
    </>
  )
}
