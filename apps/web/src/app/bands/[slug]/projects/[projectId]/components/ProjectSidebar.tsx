'use client'

import { Heading, Text, Stack, Flex, Badge } from '@/components/ui'

interface ProjectSidebarProps {
  project: any
  bandMembers: any[]
}

export function ProjectSidebar({ project, bandMembers }: ProjectSidebarProps) {
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
    <aside className="w-80 bg-white rounded-lg shadow p-4">
      <Stack spacing="lg">
        <Heading level={3}>Project Info</Heading>
        
        <Stack spacing="md">
          <Flex justify="between">
            <Text variant="small">Status</Text>
            {getStatusBadge(project.status)}
          </Flex>
          
          <Flex justify="between">
            <Text variant="small">Priority</Text>
            {getPriorityBadge(project.priority)}
          </Flex>
          
          <Flex justify="between">
            <Text variant="small">Tasks</Text>
            <Text variant="small" weight="semibold">
              {project.completedTasks}/{project.totalTasks}
            </Text>
          </Flex>

          {project.targetDate && (
            <Flex justify="between">
              <Text variant="small">Target</Text>
              <Text variant="small" weight="semibold">
                {new Date(project.targetDate).toLocaleDateString()}
              </Text>
            </Flex>
          )}

          {project.estimatedBudget && (
            <Flex justify="between">
              <Text variant="small">Budget</Text>
              <Text variant="small" weight="semibold">
                {formatCurrency(project.estimatedBudget)}
              </Text>
            </Flex>
          )}

          {project.estimatedHours && (
            <Flex justify="between">
              <Text variant="small">Est. Hours</Text>
              <Text variant="small" weight="semibold">
                {project.estimatedHours}h
              </Text>
            </Flex>
          )}
        </Stack>

        {project.totalTasks > 0 && (
          <Stack spacing="sm">
            <Text variant="small" weight="semibold">Progress</Text>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <Text variant="small" className="text-gray-500">
              {progressPercent}% complete
            </Text>
          </Stack>
        )}

        {project.lead && (
          <Stack spacing="sm">
            <Text variant="small" weight="semibold">Project Lead</Text>
            <Flex gap="sm" align="center">
              <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                {project.lead.name.charAt(0)}
              </div>
              <Text variant="small">{project.lead.name}</Text>
            </Flex>
          </Stack>
        )}

        <Stack spacing="sm">
          <Text variant="small" weight="semibold">Band Members</Text>
          {bandMembers.slice(0, 5).map((member: any) => (
            <Flex key={member.id} gap="sm" align="center">
              <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center text-xs">
                {member.user.name.charAt(0)}
              </div>
              <Text variant="small">{member.user.name}</Text>
            </Flex>
          ))}
          {bandMembers.length > 5 && (
            <Text variant="small" className="text-gray-500">
              +{bandMembers.length - 5} more
            </Text>
          )}
        </Stack>
      </Stack>
    </aside>
  )
}