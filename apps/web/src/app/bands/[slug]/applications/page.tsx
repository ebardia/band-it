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
  Alert,
  Loading,
  Badge,
  Select,
  List,
  ListItem,
  BandLayout
} from '@/components/ui'
import { AppNav } from '@/components/AppNav'

export default function BandApplicationsPage() {
  const router = useRouter()
  const params = useParams()
  const { showToast } = useToast()
  const slug = params.slug as string
  const [userId, setUserId] = useState<string | null>(null)
  const [approveRoles, setApproveRoles] = useState<Record<string, string>>({})

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

  const { data: bandData } = trpc.band.getBySlug.useQuery(
    { slug },
    { enabled: !!slug }
  )

  const { data: applicationsData, isLoading, refetch } = trpc.band.getPendingApplications.useQuery(
    { bandId: bandData?.band?.id || '' },
    { enabled: !!bandData?.band?.id }
  )

  const voteMutation = trpc.band.voteOnApplication.useMutation({
    onSuccess: (data) => {
      if (data.applicationStatus === 'APPROVED') {
        showToast('Application approved by vote!', 'success')
      } else if (data.applicationStatus === 'REJECTED') {
        showToast('Application rejected by vote', 'success')
      } else {
        showToast('Vote recorded', 'success')
      }
      refetch()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  const approveMutation = trpc.band.approveApplication.useMutation({
    onSuccess: () => {
      showToast('Application approved!', 'success')
      refetch()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  const rejectMutation = trpc.band.rejectApplication.useMutation({
    onSuccess: () => {
      showToast('Application rejected', 'success')
      refetch()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  const getApproveRole = (application: any) => {
    return approveRoles[application.id] || application.requestedRole || 'VOTING_MEMBER'
  }

  // Parse external application notes (from public website submissions)
  const parseExternalNotes = (notes: string | null) => {
    if (!notes) return null
    try {
      const parsed = JSON.parse(notes)
      // Check if this looks like an external website submission
      if (parsed.source || parsed.expertise || parsed.committees) {
        return parsed
      }
      return null
    } catch {
      return null
    }
  }

  const handleVote = (membershipId: string, vote: 'APPROVE' | 'REJECT') => {
    if (!userId) return
    voteMutation.mutate({ membershipId, voterId: userId, vote })
  }

  const handleApprove = (membershipId: string, role: string) => {
    if (!userId) return
    approveMutation.mutate({ membershipId, approverId: userId, role: role as any })
  }

  const handleReject = (membershipId: string) => {
    if (!userId) return
    rejectMutation.mutate({ membershipId, approverId: userId })
  }

  // Get user's vote on an application
  const getUserVote = (application: any): 'APPROVE' | 'REJECT' | null => {
    const vote = application.applicationVotes?.find((v: any) => v.voter?.id === userId)
    return vote?.vote || null
  }

  // Get vote counts
  const getVoteCounts = (application: any) => {
    const votes = application.applicationVotes || []
    return {
      approve: votes.filter((v: any) => v.vote === 'APPROVE').length,
      reject: votes.filter((v: any) => v.vote === 'REJECT').length,
      total: votes.length,
    }
  }

  // Format time remaining
  const formatTimeRemaining = (deadline: string | null) => {
    if (!deadline) return null
    const deadlineDate = new Date(deadline)
    const now = new Date()
    const diff = deadlineDate.getTime() - now.getTime()

    if (diff < 0) return 'Voting ended'

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

    if (days > 0) return `${days}d ${hours}h remaining`
    if (hours > 0) return `${hours}h remaining`
    return 'Less than 1h remaining'
  }

  // Check permissions
  const currentMember = bandData?.band?.members.find((m: any) => m.user.id === userId)
  const canApprove = currentMember && bandData?.band?.whoCanApprove.includes(currentMember.role)
  const canVote = currentMember && ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR', 'VOTING_MEMBER'].includes(currentMember.role)
  const isMember = !!currentMember
  const canAccessAdminTools = currentMember && ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR'].includes(currentMember.role)

  if (isLoading) {
    return (
      <>
        <AppNav />
        <BandLayout
          bandSlug={slug}
          bandName="Loading..."
          pageTitle="Pending Applications"
          isMember={false}
          wide={true}
        >
          <Loading message="Loading applications..." />
        </BandLayout>
      </>
    )
  }

  const votingSettings = applicationsData?.votingSettings

  return (
    <>
      <AppNav />
      <BandLayout
        bandSlug={slug}
        bandName={bandData?.band?.name || ''}
        bandImageUrl={bandData?.band?.imageUrl}
        pageTitle="Pending Applications"
        canApprove={canApprove}
        isMember={isMember}
        canAccessAdminTools={canAccessAdminTools}
        wide={true}
        bandId={bandData?.band?.id}
        userId={userId || undefined}
      >
        <Stack spacing="xl">
          <Stack spacing="sm">
            <Text color="muted">Review and vote on membership applications for {bandData?.band?.name}</Text>
            {votingSettings && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <Text variant="small" className="text-blue-800">
                  Voting requirements: {votingSettings.threshold}% approval needed,
                  {' '}{votingSettings.quorumRequired} of {votingSettings.totalVotingMembers} members must vote (quorum: {votingSettings.quorum}%)
                </Text>
              </div>
            )}
          </Stack>

          {applicationsData?.applications && applicationsData.applications.length > 0 ? (
            <Stack spacing="md">
              {applicationsData.applications.map((application: any) => {
                const userVote = getUserVote(application)
                const voteCounts = getVoteCounts(application)
                const timeRemaining = formatTimeRemaining(application.votingDeadline)
                const votingEnded = timeRemaining === 'Voting ended'

                return (
                  <Card key={application.id}>
                    <Stack spacing="md">
                      <Flex justify="between" align="start">
                        <div>
                          <Heading level={3}>{application.user.name}</Heading>
                          <Text variant="small" color="muted">{application.user.email}</Text>
                        </div>
                        <Flex gap="sm" wrap="wrap">
                          <Badge variant="warning">Pending</Badge>
                          {application.requestedRole && (
                            <Badge variant="info">
                              Requested: {application.requestedRole.replace('_', ' ')}
                            </Badge>
                          )}
                          {timeRemaining && (
                            <Badge variant={votingEnded ? 'danger' : 'secondary'}>
                              {timeRemaining}
                            </Badge>
                          )}
                        </Flex>
                      </Flex>

                      {/* Voting Progress */}
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <Flex justify="between" align="center" className="mb-3">
                          <Text variant="small" weight="semibold">Voting Progress</Text>
                          <Text variant="small" color="muted">
                            {voteCounts.total} of {votingSettings?.quorumRequired || '?'} votes needed for quorum
                          </Text>
                        </Flex>

                        {/* Vote bar */}
                        <div className="relative h-6 bg-gray-200 rounded-full overflow-hidden mb-3">
                          {voteCounts.total > 0 && (
                            <>
                              <div
                                className="absolute left-0 top-0 h-full bg-green-500 flex items-center justify-center text-xs text-white font-medium"
                                style={{ width: `${(voteCounts.approve / voteCounts.total) * 100}%` }}
                              >
                                {voteCounts.approve > 0 && voteCounts.approve}
                              </div>
                              <div
                                className="absolute right-0 top-0 h-full bg-red-500 flex items-center justify-center text-xs text-white font-medium"
                                style={{ width: `${(voteCounts.reject / voteCounts.total) * 100}%` }}
                              >
                                {voteCounts.reject > 0 && voteCounts.reject}
                              </div>
                            </>
                          )}
                          {voteCounts.total === 0 && (
                            <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-500">
                              No votes yet
                            </div>
                          )}
                        </div>

                        {/* Who voted */}
                        {application.applicationVotes && application.applicationVotes.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {application.applicationVotes.map((vote: any) => (
                              <Badge
                                key={vote.id}
                                variant={vote.vote === 'APPROVE' ? 'success' : 'danger'}
                              >
                                {vote.voter?.name || 'Unknown'}: {vote.vote === 'APPROVE' ? 'Yes' : 'No'}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {/* Vote buttons */}
                        {canVote && !votingEnded && (
                          <Flex gap="sm" className="mt-4">
                            <Button
                              variant={userVote === 'APPROVE' ? 'primary' : 'secondary'}
                              size="sm"
                              onClick={() => handleVote(application.id, 'APPROVE')}
                              disabled={voteMutation.isPending}
                            >
                              {userVote === 'APPROVE' ? 'Voted Yes' : 'Vote Yes'}
                            </Button>
                            <Button
                              variant={userVote === 'REJECT' ? 'danger' : 'secondary'}
                              size="sm"
                              onClick={() => handleVote(application.id, 'REJECT')}
                              disabled={voteMutation.isPending}
                            >
                              {userVote === 'REJECT' ? 'Voted No' : 'Vote No'}
                            </Button>
                            {userVote && (
                              <Text variant="small" color="muted" className="ml-2 self-center">
                                (click again to change)
                              </Text>
                            )}
                          </Flex>
                        )}
                      </div>

                      {(() => {
                        const externalData = parseExternalNotes(application.notes)
                        if (externalData) {
                          // External website application - show formatted data
                          return (
                            <Stack spacing="md">
                              {externalData.source && (
                                <Badge variant="secondary">Applied via {externalData.source}</Badge>
                              )}

                              {externalData.message && (
                                <Stack spacing="sm">
                                  <Text variant="small" weight="semibold">Why they want to join:</Text>
                                  <Text variant="small">{externalData.message}</Text>
                                </Stack>
                              )}

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {externalData.location && (
                                  <div>
                                    <Text variant="small" weight="semibold">Location:</Text>
                                    <Text variant="small">{externalData.location}</Text>
                                  </div>
                                )}

                                {externalData.phone && (
                                  <div>
                                    <Text variant="small" weight="semibold">Phone:</Text>
                                    <Text variant="small">{externalData.phone}</Text>
                                  </div>
                                )}

                                {externalData.linkedin && (
                                  <div>
                                    <Text variant="small" weight="semibold">LinkedIn:</Text>
                                    <a href={externalData.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                                      {externalData.linkedin}
                                    </a>
                                  </div>
                                )}

                                {externalData.timeCommitment && (
                                  <div>
                                    <Text variant="small" weight="semibold">Time Commitment:</Text>
                                    <Text variant="small">{externalData.timeCommitment} hours/week</Text>
                                  </div>
                                )}
                              </div>

                              {externalData.languages && externalData.languages.length > 0 && (
                                <Stack spacing="sm">
                                  <Text variant="small" weight="semibold">Languages:</Text>
                                  <Flex gap="sm" wrap="wrap">
                                    {externalData.languages.map((lang: string, idx: number) => (
                                      <Badge key={idx} variant="secondary">{lang}</Badge>
                                    ))}
                                  </Flex>
                                </Stack>
                              )}

                              {externalData.expertise && externalData.expertise.length > 0 && (
                                <Stack spacing="sm">
                                  <Text variant="small" weight="semibold">Areas of Expertise:</Text>
                                  <Flex gap="sm" wrap="wrap">
                                    {externalData.expertise.map((exp: string, idx: number) => (
                                      <Badge key={idx} variant="info">{exp}</Badge>
                                    ))}
                                  </Flex>
                                </Stack>
                              )}

                              {externalData.committees && externalData.committees.length > 0 && (
                                <Stack spacing="sm">
                                  <Text variant="small" weight="semibold">Committees of Interest:</Text>
                                  <Flex gap="sm" wrap="wrap">
                                    {externalData.committees.map((comm: string, idx: number) => (
                                      <Badge key={idx} variant="success">{comm}</Badge>
                                    ))}
                                  </Flex>
                                </Stack>
                              )}

                              {externalData.submittedAt && (
                                <Text variant="small" color="muted">
                                  Submitted: {new Date(externalData.submittedAt).toLocaleString()}
                                </Text>
                              )}
                            </Stack>
                          )
                        } else {
                          // Regular application - show notes as-is
                          return (
                            <Stack spacing="sm">
                              <Text variant="small" weight="semibold">Why they want to join:</Text>
                              <Text variant="small">{application.notes}</Text>
                            </Stack>
                          )
                        }
                      })()}

                      {application.user.strengths && application.user.strengths.length > 0 && (
                        <Stack spacing="sm">
                          <Text variant="small" weight="semibold">Strengths:</Text>
                          <List>
                            {application.user.strengths.map((strength: string, idx: number) => (
                              <ListItem key={idx}>{strength}</ListItem>
                            ))}
                          </List>
                        </Stack>
                      )}

                      {application.user.passions && application.user.passions.length > 0 && (
                        <Stack spacing="sm">
                          <Text variant="small" weight="semibold">Passions:</Text>
                          <List>
                            {application.user.passions.map((passion: string, idx: number) => (
                              <ListItem key={idx}>{passion}</ListItem>
                            ))}
                          </List>
                        </Stack>
                      )}

                      {application.user.developmentPath && application.user.developmentPath.length > 0 && (
                        <Stack spacing="sm">
                          <Text variant="small" weight="semibold">What they want to learn:</Text>
                          <List>
                            {application.user.developmentPath.map((goal: string, idx: number) => (
                              <ListItem key={idx}>{goal}</ListItem>
                            ))}
                          </List>
                        </Stack>
                      )}

                      {/* Admin override section - only for those with whoCanApprove permission */}
                      {canApprove && (
                        <div className="border-t border-gray-200 pt-4 mt-4">
                          <Text variant="small" weight="semibold" className="mb-3">
                            Admin Override (bypass voting)
                          </Text>
                          <Flex gap="md" align="end">
                            <Select
                              label="Assign Role"
                              value={getApproveRole(application)}
                              onChange={(e) =>
                                setApproveRoles((prev) => ({ ...prev, [application.id]: e.target.value }))
                              }
                            >
                              <option value="OBSERVER">Observer</option>
                              <option value="VOTING_MEMBER">Voting Member</option>
                              <option value="CONDUCTOR">Conductor</option>
                              <option value="MODERATOR">Moderator</option>
                              <option value="GOVERNOR">Governor</option>
                            </Select>
                            <Button
                              variant="primary"
                              size="md"
                              onClick={() => handleApprove(application.id, getApproveRole(application))}
                              disabled={approveMutation.isPending || rejectMutation.isPending}
                            >
                              {approveMutation.isPending ? 'Approving...' : 'Approve Now'}
                            </Button>
                            <Button
                              variant="danger"
                              size="md"
                              onClick={() => handleReject(application.id)}
                              disabled={approveMutation.isPending || rejectMutation.isPending}
                            >
                              {rejectMutation.isPending ? 'Rejecting...' : 'Reject Now'}
                            </Button>
                          </Flex>
                        </div>
                      )}
                    </Stack>
                  </Card>
                )
              })}
            </Stack>
          ) : (
            <Alert variant="info">
              <Text>No pending applications at this time.</Text>
            </Alert>
          )}
        </Stack>
      </BandLayout>
    </>
  )
}
