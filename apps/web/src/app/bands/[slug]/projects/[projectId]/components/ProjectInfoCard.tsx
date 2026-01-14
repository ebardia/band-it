'use client'

import { useState } from 'react'
import { Text, Stack, Flex, Badge, Button, Card } from '@/components/ui'

interface ProjectInfoCardProps {
  project: any
  bandMembers: any[]
}

export function ProjectInfoCard({ project, bandMembers }: ProjectInfoCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

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

  const formatCurrency = (amount: any) => {
    if (!amount) return null
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const progressPercent = project.totalTasks > 0
    ? Math.round((project.completedTasks / project.totalTasks) * 100)
    : 0

  return (
    <Card>
      <Stack spacing="md">
        <Flex justify="between" align="center">
          <Flex gap="md" align="center" className="flex-wrap">
            {getStatusBadge(project.status)}
            {getPriorityBadge(project.priority)}
            <Text variant="small" color="muted">
              {project.completedTasks}/{project.totalTasks} tasks
            </Text>
            {project.targetDate && (
              <Text variant="small" color="muted">
                Target: {new Date(project.targetDate).toLocaleDateString()}
              </Text>
            )}
            {progressPercent > 0 && (
              <Text variant="small" color="muted">
                {progressPercent}% complete
              </Text>
            )}
          </Flex>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? '▲ Less' : '▼ More'}
          </Button>
        </Flex>

        {isExpanded && (
          <Stack spacing="lg">
            {project.description && (
              <Stack spacing="xs">
                <Text variant="small" weight="semibold">Description</Text>
                <Text variant="small">{project.description}</Text>
              </Stack>
            )}

            <Flex gap="lg" className="flex-wrap">
              <Stack spacing="xs">
                <Text variant="small" weight="semibold">Created By</Text>
                <Text variant="small">{project.createdBy.name}</Text>
              </Stack>
              
              <Stack spacing="xs">
                <Text variant="small" weight="semibold">Created</Text>
                <Text variant="small">{new Date(project.createdAt).toLocaleDateString()}</Text>
              </Stack>

              {project.startDate && (
                <Stack spacing="xs">
                  <Text variant="small" weight="semibold">Start Date</Text>
                  <Text variant="small">{new Date(project.startDate).toLocaleDateString()}</Text>
                </Stack>
              )}

              {project.targetDate && (
                <Stack spacing="xs">
                  <Text variant="small" weight="semibold">Target Date</Text>
                  <Text variant="small">{new Date(project.targetDate).toLocaleDateString()}</Text>
                </Stack>
              )}

              {project.estimatedBudget && (
                <Stack spacing="xs">
                  <Text variant="small" weight="semibold">Budget</Text>
                  <Text variant="small">{formatCurrency(project.estimatedBudget)}</Text>
                </Stack>
              )}

              {project.estimatedHours && (
                <Stack spacing="xs">
                  <Text variant="small" weight="semibold">Est. Hours</Text>
                  <Text variant="small">{project.estimatedHours}h</Text>
                </Stack>
              )}
            </Flex>

            {project.lead && (
              <Stack spacing="xs">
                <Text variant="small" weight="semibold">Project Lead</Text>
                <Text variant="small">{project.lead.name}</Text>
              </Stack>
            )}

            {project.deliverables && (
              <Stack spacing="xs">
                <Text variant="small" weight="semibold">Deliverables</Text>
                <Text variant="small">{project.deliverables}</Text>
              </Stack>
            )}

            {project.successCriteria && (
              <Stack spacing="xs">
                <Text variant="small" weight="semibold">Success Criteria</Text>
                <Text variant="small">{project.successCriteria}</Text>
              </Stack>
            )}

            {project.totalTasks > 0 && (
              <Stack spacing="xs">
                <Text variant="small" weight="semibold">Progress</Text>
                <Flex align="center" gap="sm">
                  <Card className="flex-1 h-2 p-0 overflow-hidden">
                    <Card className={`h-full bg-green-500 p-0`} style={{ width: `${progressPercent}%` }} />
                  </Card>
                  <Text variant="small" color="muted">{progressPercent}%</Text>
                </Flex>
              </Stack>
            )}
          </Stack>
        )}
      </Stack>
    </Card>
  )
}