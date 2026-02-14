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
        <Stack spacing="md">
          {/* Summary Stats */}
          <div className="flex gap-2 md:gap-4 flex-wrap">
            <div className="flex-1 min-w-[70px] bg-white border border-gray-200 rounded-lg p-3 text-center">
              <Text variant="small" color="muted">To Do</Text>
              <div className="text-xl font-bold">{statusCounts.TODO}</div>
            </div>
            <div className="flex-1 min-w-[70px] bg-white border border-gray-200 rounded-lg p-3 text-center">
              <Text variant="small" color="muted">In Progress</Text>
              <div className="text-xl font-bold">{statusCounts.IN_PROGRESS}</div>
            </div>
            <div className="flex-1 min-w-[70px] bg-white border border-gray-200 rounded-lg p-3 text-center">
              <Text variant="small" color="muted">In Review</Text>
              <div className="text-xl font-bold">{statusCounts.IN_REVIEW}</div>
            </div>
            <div className="flex-1 min-w-[70px] bg-white border border-gray-200 rounded-lg p-3 text-center">
              <Text variant="small" color="muted">Completed</Text>
              <div className="text-xl font-bold">{statusCounts.COMPLETED}</div>
            </div>
          </div>

          {/* My Tasks Quick View */}
          {myTasks.length > 0 && (
            <div className="border border-blue-200 rounded-lg bg-blue-50 overflow-hidden">
              <div className="px-3 py-2 border-b border-blue-200 bg-blue-100">
                <Text weight="semibold">My Tasks ({myTasks.length})</Text>
              </div>
              {myTasks.slice(0, 3).map((task: any) => (
                <div
                  key={task.id}
                  className="flex items-center py-2 px-3 border-b border-blue-100 last:border-b-0 cursor-pointer hover:bg-blue-100"
                  onClick={() => router.push(`/bands/${slug}/tasks/${task.id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Text weight="semibold" className="truncate">{task.name}</Text>
                      {getStatusBadge(task.status)}
                      {getPriorityBadge(task.priority)}
                    </div>
                    <Text variant="small" color="muted">{task.project.name}</Text>
                  </div>
                  <span className="text-gray-400 ml-2">→</span>
                </div>
              ))}
              {myTasks.length > 3 && (
                <div className="px-3 py-2 bg-blue-100">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAssigneeFilter(userId!)}
                  >
                    View all {myTasks.length} tasks →
                  </Button>
                </div>
              )}
            </div>
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
            <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
              {tasks.map((task: any) => (
                <div
                  key={task.id}
                  className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50 cursor-pointer"
                  onClick={() => router.push(`/bands/${slug}/tasks/${task.id}`)}
                >
                  <div className="flex items-center py-3 px-3 md:px-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Text weight="semibold" className="truncate">{task.name}</Text>
                        {getStatusBadge(task.status)}
                        {getPriorityBadge(task.priority)}
                        {!task.assignee && <Badge variant="warning">Unassigned</Badge>}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-500 mt-1 flex-wrap">
                        <span>{task.project.name}</span>
                        {task.assignee && (
                          <>
                            <span>•</span>
                            <span>{task.assignee.name}</span>
                          </>
                        )}
                        {task.dueDate && (
                          <>
                            <span>•</span>
                            <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                          </>
                        )}
                        {task.estimatedHours && (
                          <>
                            <span>•</span>
                            <span>{task.estimatedHours}h</span>
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
              <Text color="muted" className="mb-2">No tasks found.</Text>
              <Text variant="small" color="muted" className="mb-4">
                Tasks are created within projects. Go to a project to create tasks.
              </Text>
              <Button
                variant="primary"
                size="sm"
                onClick={() => router.push(`/bands/${slug}/projects`)}
              >
                View Projects
              </Button>
            </div>
          )}
        </Stack>
      </BandLayout>
    </>
  )
}