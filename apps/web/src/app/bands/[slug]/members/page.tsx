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
        bandImageUrl={band.imageUrl}
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
        <Stack spacing="md">
          {/* Role Summary */}
          <Flex gap="sm" className="flex-wrap">
            {ROLE_ORDER.filter(role => roleCounts[role]).map(role => (
              <Badge key={role} variant={ROLE_COLORS[role]}>
                {ROLE_LABELS[role]}: {roleCounts[role]}
              </Badge>
            ))}
          </Flex>

          {/* Members List */}
          {sortedMembers.length > 0 ? (
            <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
              {sortedMembers.map((member: any) => (
                <div
                  key={member.id}
                  className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50 cursor-pointer"
                  onClick={() => openProfileModal(member)}
                >
                  <div className="flex items-center py-3 px-3 md:px-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Text weight="semibold">{member.user.name}</Text>
                        <Badge variant={ROLE_COLORS[member.role]}>
                          {ROLE_LABELS[member.role]}
                        </Badge>
                        {member.status !== 'ACTIVE' && (
                          <Badge variant="warning">{member.status}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-500 mt-1 flex-wrap">
                        {member.stats && (
                          <>
                            <span>{member.stats.tasksCompleted} tasks</span>
                            <span>•</span>
                            <span>{member.stats.proposalsCreated} proposals</span>
                            <span>•</span>
                            <span>{member.stats.votesCount} votes</span>
                            <span>•</span>
                          </>
                        )}
                        <span>Joined {new Date(member.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <span className="text-gray-400 ml-2">→</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Text variant="small" color="muted">No members found.</Text>
          )}
        </Stack>

        {/* Member Profile Modal */}
        <Modal isOpen={showProfileModal} onClose={closeProfileModal}>
          <Stack spacing="md">
            {profileLoading ? (
              <Loading message="Loading profile..." />
            ) : profileData?.member ? (
              <>
                <div className="flex items-center gap-2">
                  <Text weight="semibold" className="text-lg">{profileData.member.user.name}</Text>
                  <Badge variant={ROLE_COLORS[profileData.member.role]}>
                    {ROLE_LABELS[profileData.member.role]}
                  </Badge>
                </div>

                <div className="bg-gray-50 rounded p-3">
                  <Text variant="small" weight="semibold" className="mb-2">Stats</Text>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div><span className="text-gray-500">Tasks: </span><span className="font-medium">{profileData.stats.tasksCompleted}</span></div>
                    <div><span className="text-gray-500">In Progress: </span><span className="font-medium">{profileData.stats.tasksInProgress}</span></div>
                    <div><span className="text-gray-500">Proposals: </span><span className="font-medium">{profileData.stats.proposalsCreated}</span></div>
                    <div><span className="text-gray-500">Approved: </span><span className="font-medium">{profileData.stats.proposalsApproved}</span></div>
                    <div><span className="text-gray-500">Votes: </span><span className="font-medium">{profileData.stats.votesCount}</span></div>
                    <div><span className="text-gray-500">Projects: </span><span className="font-medium">{profileData.stats.projectsLed}</span></div>
                  </div>
                </div>

                {profileData.member.user.strengths?.length > 0 && (
                  <div>
                    <Text variant="small" weight="semibold">Strengths</Text>
                    <Flex gap="sm" className="flex-wrap mt-1">
                      {profileData.member.user.strengths.map((s: string, i: number) => (
                        <Badge key={i} variant="neutral">{s}</Badge>
                      ))}
                    </Flex>
                  </div>
                )}

                {profileData.member.user.passions?.length > 0 && (
                  <div>
                    <Text variant="small" weight="semibold">Passions</Text>
                    <Flex gap="sm" className="flex-wrap mt-1">
                      {profileData.member.user.passions.map((p: string, i: number) => (
                        <Badge key={i} variant="info">{p}</Badge>
                      ))}
                    </Flex>
                  </div>
                )}

                {profileData.recentActivity.tasks.length > 0 && (
                  <div>
                    <Text variant="small" weight="semibold">Recent Tasks</Text>
                    <div className="mt-1">
                      {profileData.recentActivity.tasks.map((task: any) => (
                        <div key={task.id} className="flex justify-between text-sm py-1">
                          <span>{task.name}</span>
                          <Badge variant={task.status === 'COMPLETED' ? 'success' : 'neutral'}>
                            {task.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Text variant="small" color="muted">
                  Member since {new Date(profileData.member.createdAt).toLocaleDateString()}
                </Text>

                <Flex gap="sm" justify="between" className="pt-2 border-t border-gray-200">
                  {canManageMembers && selectedMember?.userId !== userId && selectedMember?.role !== 'FOUNDER' && (
                    <Button variant="secondary" size="sm" onClick={() => goToMemberActions(selectedMember.id)}>
                      Manage
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={closeProfileModal}>Close</Button>
                </Flex>
              </>
            ) : (
              <Alert variant="danger">
                <Text>Could not load member profile</Text>
              </Alert>
            )}
          </Stack>
        </Modal>
      </BandLayout>
    </>
  )
}
