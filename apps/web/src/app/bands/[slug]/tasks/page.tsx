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
  Flex,
  Card,
  Badge,
  Loading,
  Alert,
  BandLayout
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
      <>
        <AppNav />
        <BandLayout
          bandSlug={slug}
          bandName="Loading..."
          pageTitle="Band Tasks"
          isMember={false}
          wide={true}
          bandId={bandData?.band?.id}
          userId={userId || undefined}
        >
          <Loading message="Loading tasks..." />
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
          pageTitle="Band Tasks"
          isMember={false}
          wide={true}
          bandId={bandData?.band?.id}
          userId={userId || undefined}
        >
          <Alert variant="danger">
            <Text>Band not found</Text>
          </Alert>
        </BandLayout>
      </>
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

  const statusCounts = {
    TODO: tasks.filter((t: any) => t.status === 'TODO').length,
    IN_PROGRESS: tasks.filter((t: any) => t.status === 'IN_PROGRESS').length,
    IN_REVIEW: tasks.filter((t: any) => t.status === 'IN_REVIEW').length,
    COMPLETED: tasks.filter((t: any) => t.status === 'COMPLETED').length,
    BLOCKED: tasks.filter((t: any) => t.status === 'BLOCKED').length,
  }

  const myTasks = tasks.filter((t: any) => t.assigneeId === userId)

  return (
    <>
      <AppNav />
      <BandLayout
        bandSlug={slug}
        bandName={band.name}
        bandImageUrl={band.imageUrl}
        pageTitle="Band Tasks"
        canApprove={canApprove}
        isMember={isMember}
        wide={true}
        bandId={bandData?.band?.id}
        userId={userId || undefined}
      >
        <Stack spacing="xl">
          {/* Summary Stats */}
          <Flex gap="md" className="flex-wrap">
            <Card className="flex-1 min-w-[100px]">
              <Stack spacing="xs">
                <Text variant="small" color="muted">To Do</Text>
                <Heading level={2}>{statusCounts.TODO}</Heading>
              </Stack>
            </Card>
            <Card className="flex-1 min-w-[100px]">
              <Stack spacing="xs">
                <Text variant="small" color="muted">In Progress</Text>
                <Heading level={2}>{statusCounts.IN_PROGRESS}</Heading>
              </Stack>
            </Card>
            <Card className="flex-1 min-w-[100px]">
              <Stack spacing="xs">
                <Text variant="small" color="muted">In Review</Text>
                <Heading level={2}>{statusCounts.IN_REVIEW}</Heading>
              </Stack>
            </Card>
            <Card className="flex-1 min-w-[100px]">
              <Stack spacing="xs">
                <Text variant="small" color="muted">Completed</Text>
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
                      onClick={() => router.push(`/bands/${slug}/tasks/${task.id}`)}
                    >
                      <Flex justify="between" align="center">
                        <Stack spacing="xs">
                          <Text weight="semibold">{task.name}</Text>
                          <Text variant="small" color="muted">
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
                  hover
                  onClick={() => router.push(`/bands/${slug}/tasks/${task.id}`)}
                >
                  <Flex justify="between" align="start">
                    <Stack spacing="sm">
                      <Flex gap="sm" align="center">
                        <Heading level={3}>{task.name}</Heading>
                      </Flex>
                      <Text variant="small" color="muted">
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
                          <Text variant="small" color="muted">
                            Due: {new Date(task.dueDate).toLocaleDateString()}
                          </Text>
                        )}
                        {task.estimatedHours && (
                          <Text variant="small" color="muted">
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
                <Text variant="small" color="muted">
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
      </BandLayout>
    </>
  )
}