'use client'

import { Heading, Text, Stack, Flex, Card } from '@/components/ui'

interface ProjectDetailsProps {
  project: any
}

export function ProjectDetails({ project }: ProjectDetailsProps) {
  return (
    <Card>
      <Stack spacing="lg">
        <Heading level={2}>Details</Heading>
        
        {project.description ? (
          <Stack spacing="sm">
            <Text weight="semibold">Description</Text>
            <Text style={{ whiteSpace: 'pre-wrap' }}>{project.description}</Text>
          </Stack>
        ) : (
          <Text variant="muted">No description provided</Text>
        )}

        <Flex gap="lg" className="flex-wrap">
          <Stack spacing="sm">
            <Text weight="semibold">Created By</Text>
            <Text>{project.createdBy.name}</Text>
          </Stack>
          <Stack spacing="sm">
            <Text weight="semibold">Created</Text>
            <Text>{new Date(project.createdAt).toLocaleDateString()}</Text>
          </Stack>
          {project.startDate && (
            <Stack spacing="sm">
              <Text weight="semibold">Start Date</Text>
              <Text>{new Date(project.startDate).toLocaleDateString()}</Text>
            </Stack>
          )}
          {project.targetDate && (
            <Stack spacing="sm">
              <Text weight="semibold">Target Date</Text>
              <Text>{new Date(project.targetDate).toLocaleDateString()}</Text>
            </Stack>
          )}
        </Flex>
      </Stack>
    </Card>
  )
}