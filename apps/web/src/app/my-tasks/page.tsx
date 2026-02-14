'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { jwtDecode } from 'jwt-decode'
import {
  Heading,
  Text,
  Stack,
  Button,
  PageWrapper,
  Flex,
  Badge,
  Loading
} from '@/components/ui'
import { AppNav } from '@/components/AppNav'
import { DashboardSidebar } from '@/components/DashboardSidebar'

export default function MyTasksPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)

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

  const { data: myProposalsData } = trpc.proposal.getMyProposals.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  )

  const { data: myProjectsData } = trpc.project.getMyProjects.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  )

  const { data: myTasksData, isLoading } = trpc.task.getMyTasks.useQuery(
    { userId: userId!, status: statusFilter as any },
    { enabled: !!userId }
  )

  if (!userId || isLoading) {
    return (
      <PageWrapper variant="dashboard">
        <AppNav />
        <div className="flex-1 p-8">
          <Loading message="Loading tasks..." />
        </div>
      </PageWrapper>
    )
  }

  const bandCount = myBandsData?.bands.length || 0
  const proposalCount = myProposalsData?.proposals.length || 0
  const projectCount = myProjectsData?.projects.length || 0
  const taskCount = myTasksData?.tasks.length || 0
  const tasks = myTasksData?.tasks || []

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'TODO':
        return <Badge variant="neutral">To Do</Badge>
      case 'IN_PROGRESS':
        return <Badge variant="info">In Progress</Badge>
      case 'IN_REVIEW':
        return <Badge variant="warning">In Review</Badge>
      case 'COMPLETED':
        return <Badge variant="success">Completed</Badge>
      case 'BLOCKED':
        return <Badge variant="danger">Blocked</Badge>
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

  const statusFilters = [
    { value: undefined, label: 'All' },
    { value: 'TODO', label: 'To Do' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'IN_REVIEW', label: 'In Review' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'BLOCKED', label: 'Blocked' },
  ]

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
              <Heading level={1}>My Tasks</Heading>
              <Text color="muted">Tasks assigned to you across all bands</Text>
            </Stack>

            {/* Filters */}
            <Flex gap="sm" className="flex-wrap">
              {statusFilters.map((filter) => (
                <Button
                  key={filter.value || 'all'}
                  variant={statusFilter === filter.value ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setStatusFilter(filter.value)}
                >
                  {filter.label}
                </Button>
              ))}
            </Flex>

            {tasks.length > 0 ? (
              <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
                {tasks.map((task: any) => (
                  <div
                    key={task.id}
                    className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/bands/${task.band.slug}/tasks/${task.id}`)}
                  >
                    <div className="flex items-center py-3 px-3 md:px-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Text weight="semibold" className="truncate">{task.name}</Text>
                          {getStatusBadge(task.status)}
                          {getPriorityBadge(task.priority)}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-500 mt-1 flex-wrap">
                          <span>{task.band.name}</span>
                          <span>•</span>
                          <span>{task.project.name}</span>
                          {task.dueDate && (
                            <>
                              <span>•</span>
                              <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <span className="text-gray-400 ml-2">→</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg bg-white p-6 text-center">
                <Text color="muted" className="mb-2">No tasks assigned to you{statusFilter ? ' with this status' : ''}.</Text>
                <Text variant="small" color="muted">
                  Tasks are created within projects and can be assigned to band members.
                </Text>
              </div>
            )}
          </Stack>
        </div>
      </div>
    </PageWrapper>
  )
}