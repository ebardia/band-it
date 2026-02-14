'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { jwtDecode } from 'jwt-decode'
import {
  Heading,
  Text,
  Stack,
  PageWrapper,
  Flex,
  Badge,
  Loading
} from '@/components/ui'
import { AppNav } from '@/components/AppNav'
import { DashboardSidebar } from '@/components/DashboardSidebar'

export default function MyProposalsPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)

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

  const { data: myBandsData } = trpc.band.getMyBands.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  )

  const { data: myProposalsData, isLoading } = trpc.proposal.getMyProposals.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  )

  const { data: myProjectsData } = trpc.project.getMyProjects.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  )

  const { data: myTasksData } = trpc.task.getMyTasks.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  )

  if (!userId || isLoading) {
    return (
      <PageWrapper variant="dashboard">
        <AppNav />
        <div className="flex-1 p-8">
          <Loading message="Loading proposals..." />
        </div>
      </PageWrapper>
    )
  }

  const bandCount = myBandsData?.bands.length || 0
  const proposalCount = myProposalsData?.proposals.length || 0
  const projectCount = myProjectsData?.projects.length || 0
  const taskCount = myTasksData?.tasks.length || 0
  const proposals = myProposalsData?.proposals || []

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <Badge variant="info">Open</Badge>
      case 'APPROVED':
        return <Badge variant="success">Approved</Badge>
      case 'REJECTED':
        return <Badge variant="danger">Rejected</Badge>
      case 'CLOSED':
        return <Badge variant="neutral">Closed</Badge>
      default:
        return <Badge variant="neutral">{status}</Badge>
    }
  }

  return (
    <PageWrapper variant="dashboard">
      <AppNav />

      <div className="flex min-h-[calc(100vh-64px)] gap-6 p-6">
        {/* Left Sidebar */}
        <DashboardSidebar
          bandCount={bandCount}
          proposalCount={proposalCount}
          projectCount={projectCount}
          taskCount={taskCount}
        />

        {/* Main Content Area */}
        <div className="flex-1">
          <Stack spacing="md">
            <Stack spacing="xs">
              <Heading level={1}>My Proposals</Heading>
              <Text color="muted">Proposals you've created across all bands</Text>
            </Stack>

            {proposals.length > 0 ? (
              <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
                {proposals.map((proposal: any) => (
                  <div
                    key={proposal.id}
                    className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/bands/${proposal.band.slug}/proposals/${proposal.id}`)}
                  >
                    <div className="flex items-center py-3 px-3 md:px-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Text weight="semibold" className="truncate">{proposal.title}</Text>
                          {getStatusBadge(proposal.status)}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-500 mt-1 flex-wrap">
                          <span>{proposal.band.name}</span>
                          <span>•</span>
                          <span>{proposal._count.votes} votes</span>
                        </div>
                      </div>
                      <span className="text-gray-400 ml-2">→</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg bg-white p-6 text-center">
                <Text color="muted" className="mb-2">You haven't created any proposals yet.</Text>
                <Text variant="small" color="muted">
                  Go to one of your bands to create a proposal.
                </Text>
              </div>
            )}
          </Stack>
        </div>
      </div>
    </PageWrapper>
  )
}