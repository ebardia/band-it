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
  BandSidebar
} from '@/components/ui'
import { AppNav } from '@/components/AppNav'

export default function BandTasksPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  const [userId, setUserId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)
  const [assigneeFilter, setAssigneeFilter] = useState<string | undefined>(undefined)

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

  const { data: tasksData, isLoading: tasksLoading } = trpc.task.getByBand.useQuery(
    { 
      bandId: bandData?.band?.id || '', 
      status: statusFilter as any,
      assigneeId: assigneeFilter,
    },
    { enabled: !!bandData?.band?.id }
  )

  if (bandLoading || tasksLoading) {
    return (
      <PageWrapper variant="dashboard">
        <AppNav />
        <DashboardContainer>
          <Loading message="Loading tasks..." />
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

  const band = bandData.band
  const tasks = tasksData?.tasks || []
  const currentMember = band.members.find((m: any) => m.user.id === userId)
  const isMember = !!currentMember
  const canApprove = currentMember && band.whoCanApprove.includes(currentMember.role)

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

  // Group tasks by status for summary
  const statusCounts = {
    TODO: tasks.filter((t: any) => t.status === 'TODO').length,
    IN_PROGRESS: tasks.filter((t: any) => t.status === 'IN_PROGRESS').length,
    IN_REVIEW: tasks.filter((t: any) => t.status === 'IN_REVIEW').length,
    COMPLETED: tasks.filter((t: any) => t.status === 'COMPLETED').length,
    BLOCKED: tasks.filter((t: any) => t.status === 'BLOCKED').length,
  }

  const myTasks = tasks.filter((t: any) => t.assigneeId === userId)

  return (
    <PageWrapper variant="dashboard">
      <AppNav />

      <DashboardContainer>
        <Flex gap="md" align="start">
          {/* Left Sidebar */}
          <BandSidebar 
            bandSlug={slug} 
            canApprove={canApprove} 
            isMember={isMember}
          />

          {/* Main Content */}
          <div className="flex-1 bg-white rounded-lg shadow p-8">
            <Stack spacing="xl">
              {/* Header */}
              <Stack spacing="sm">
                <Heading level={1}>Tasks</Heading>
                <Text variant="muted">{band.name}</Text>
              </Stack>

              {/* Summary Stats */}
              <Flex gap="md" className="flex-wrap">
                <Card className="flex-1 min-w-[100px]">
                  <Stack spacing="xs">
                    <Text variant="small" className="text-gray-500">To Do</Text>
                    <Heading level={2}>{statusCounts.TODO}</Heading>
                  </Stack>
                </Card>
                <Card className="flex-1 min-w-[100px]">
                  <Stack spacing="xs">
                    <Text variant="small" className="text-gray-500">In Progress</Text>
                    <Heading level={2}>{statusCounts.IN_PROGRESS}</Heading>
                  </Stack>
                </Card>
                <Card className="flex-1 min-w-[100px]">
                  <Stack spacing="xs">
                    <Text variant="small" className="text-gray-500">In Review</Text>
                    <Heading level={2}>{statusCounts.IN_REVIEW}</Heading>
                  </Stack>
                </Card>
                <Card className="flex-1 min-w-[100px]">
                  <Stack spacing="xs">
                    <Text variant="small" className="text-gray-500">Completed</Text>
                    <Heading level={2}>{statusCounts.COMPLETED}</Heading>
                  </Stack>
                </Card>
              </Flex>

              {/* My Tasks Quick View */}
              {myTasks.length > 0 && (
                <Card>
                  <Stack spacing="md">
                    <Heading level={3}>My Tasks ({myTasks.length})</Heading>
                    <Stack spacing="sm">
                      {myTasks.slice(0, 3).map((task: any) => (
                        <div 
                          key={task.id}
                          className="p-3 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100"
                          onClick={() => router.push(`/bands/${slug}/projects/${task.projectId}?task=${task.id}`)}
                        >
                          <Flex justify="between" align="center">
                            <Stack spacing="xs">
                              <Text weight="semibold">{task.name}</Text>
                              <Text variant="small" className="text-gray-500">
                                {task.project.name}
                              </Text>
                            </Stack>
                            <Flex gap="sm">
                              {getStatusBadge(task.status)}
                              {getPriorityBadge(task.priority)}
                            </Flex>
                          </Flex>
                        </div>
                      ))}
                      {myTasks.length > 3 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setAssigneeFilter(userId!)}
                        >
                          View all {myTasks.length} tasks →
                        </Button>
                      )}
                    </Stack>
                  </Stack>
                </Card>
              )}

              {/* Filters */}
              <Stack spacing="md">
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
                
                <Flex gap="sm">
                  <Button
                    variant={assigneeFilter === undefined ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setAssigneeFilter(undefined)}
                  >
                    All Members
                  </Button>
                  <Button
                    variant={assigneeFilter === userId ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setAssigneeFilter(userId!)}
                  >
                    My Tasks
                  </Button>
                  <Button
                    variant={assigneeFilter === 'unassigned' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setAssigneeFilter('unassigned')}
                  >
                    Unassigned
                  </Button>
                </Flex>
              </Stack>

              {/* Tasks List */}
              {tasks.length > 0 ? (
                <Stack spacing="md">
                  {tasks.map((task: any) => (
                    <Card 
                      key={task.id}
                      className="cursor-pointer hover:shadow-lg transition"
                      onClick={() => router.push(`/bands/${slug}/projects/${task.projectId}?task=${task.id}`)}
                    >
                      <Flex justify="between" align="start">
                        <Stack spacing="sm">
                          <Flex gap="sm" align="center">
                            <Heading level={3}>{task.name}</Heading>
                          </Flex>
                          <Text variant="small" className="text-gray-500">
                            Project: {task.project.name}
                          </Text>
                          <Flex gap="sm" className="flex-wrap">
                            {getStatusBadge(task.status)}
                            {getPriorityBadge(task.priority)}
                            {task.assignee && (
                              <Badge variant="neutral">
                                Assigned: {task.assignee.name}
                              </Badge>
                            )}
                            {!task.assignee && (
                              <Badge variant="warning">Unassigned</Badge>
                            )}
                          </Flex>
                          <Flex gap="md" className="flex-wrap">
                            {task.dueDate && (
                              <Text variant="small" className="text-gray-500">
                                Due: {new Date(task.dueDate).toLocaleDateString()}
                              </Text>
                            )}
                            {task.estimatedHours && (
                              <Text variant="small" className="text-gray-500">
                                Est: {task.estimatedHours}h
                              </Text>
                            )}
                          </Flex>
                        </Stack>
                        <Button variant="secondary" size="sm">
                          View →
                        </Button>
                      </Flex>
                    </Card>
                  ))}
                </Stack>
              ) : (
                <Alert variant="info">
                  <Stack spacing="sm">
                    <Text>No tasks found.</Text>
                    <Text variant="small" className="text-gray-600">
                      Tasks are created within projects. Go to a project to create tasks.
                    </Text>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => router.push(`/bands/${slug}/projects`)}
                    >
                      View Projects
                    </Button>
                  </Stack>
                </Alert>
              )}
            </Stack>
          </div>
        </Flex>
      </DashboardContainer>
    </PageWrapper>
  )
}