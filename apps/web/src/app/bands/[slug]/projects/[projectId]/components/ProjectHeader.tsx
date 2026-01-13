'use client'

import { Heading, Text, Stack, Flex, Badge, Button } from '@/components/ui'
import { AIValidationBadge } from '@/components/ui/AIValidationBadge'

interface ProjectHeaderProps {
  project: any
  proposal: any
  canUpdateProject: boolean
  onEdit: () => void
  onValidate: () => void
  isValidating: boolean
}

export function ProjectHeader({
  project,
  proposal,
  canUpdateProject,
  onEdit,
  onValidate,
  isValidating,
}: ProjectHeaderProps) {
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
        return <Badge variant="neutral">Low Priority</Badge>
      case 'MEDIUM':
        return <Badge variant="info">Medium Priority</Badge>
      case 'HIGH':
        return <Badge variant="warning">High Priority</Badge>
      case 'URGENT':
        return <Badge variant="danger">Urgent</Badge>
      default:
        return <Badge variant="neutral">{priority}</Badge>
    }
  }

  return (
    <Flex justify="between" align="start">
      <Stack spacing="sm">
        <Flex gap="sm" align="center">
          <Heading level={1}>{project.name}</Heading>
          {project.aiGenerated && (
            <Badge variant="info">AI Generated</Badge>
          )}
        </Flex>
        <Text variant="muted">From proposal: {proposal.title}</Text>
        <Flex gap="sm">
          {getStatusBadge(project.status)}
          {getPriorityBadge(project.priority)}
          {project.lead && (
            <Badge variant="neutral">Lead: {project.lead.name}</Badge>
          )}
        </Flex>
        {project.tags && project.tags.length > 0 && (
          <Flex gap="sm" className="flex-wrap">
            {project.tags.map((tag: string, i: number) => (
              <span key={i} className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-sm">
                {tag}
              </span>
            ))}
          </Flex>
        )}
        <AIValidationBadge
          validation={project.aiValidation as any}
          onValidate={onValidate}
          isValidating={isValidating}
        />
      </Stack>
      {canUpdateProject && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onEdit}
        >
          Edit Project
        </Button>
      )}
    </Flex>
  )
}