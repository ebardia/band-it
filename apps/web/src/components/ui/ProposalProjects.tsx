'use client'

import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import {
  Heading,
  Text,
  Stack,
  Button,
  Flex,
  Card,
  Badge,
  Alert
} from '@/components/ui'

interface ProposalProjectsProps {
  proposalId: string
  proposalStatus: string
  bandSlug: string
  canCreateProject: boolean
}

export function ProposalProjects({
  proposalId,
  proposalStatus,
  bandSlug,
  canCreateProject,
}: ProposalProjectsProps) {
  const router = useRouter()
  const isApproved = proposalStatus === 'APPROVED'

  const { data: projectsData, isLoading } = trpc.project.getByProposal.useQuery(
    { proposalId },
    { enabled: isApproved }
  )

  const projects = projectsData?.projects || []

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

  // Don't show for non-approved proposals
  if (!isApproved) {
    return null
  }

  return (
    <Card>
      <Stack spacing="lg">
        <Flex justify="between" align="center">
          <Heading level={2}>Projects ({projects.length})</Heading>
          {canCreateProject && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => router.push(`/bands/${bandSlug}/proposals/${proposalId}/projects`)}
            >
              Manage Projects
            </Button>
          )}
        </Flex>

        {isLoading ? (
          <Text variant="muted">Loading projects...</Text>
        ) : projects.length > 0 ? (
          <Stack spacing="md">
            {projects.slice(0, 3).map((project: any) => (
              <div 
                key={project.id} 
                className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition"
                onClick={() => router.push(`/bands/${bandSlug}/projects/${project.id}`)}
              >
                <Flex justify="between" align="center">
                  <Stack spacing="sm">
                    <Flex gap="sm" align="center">
                      <Text weight="semibold">{project.name}</Text>
                      {project.aiGenerated && (
                        <Badge variant="info">AI</Badge>
                      )}
                    </Flex>
                    {project.description && (
                      <Text variant="small" className="text-gray-500">
                        {project.description.slice(0, 100)}
                        {project.description.length > 100 && '...'}
                      </Text>
                    )}
                  </Stack>
                  {getStatusBadge(project.status)}
                </Flex>
              </div>
            ))}
            {projects.length > 3 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/bands/${bandSlug}/proposals/${proposalId}/projects`)}
              >
                View all {projects.length} projects →
              </Button>
            )}
          </Stack>
        ) : (
          <Stack spacing="md">
            <Alert variant="info">
              <Text>This approved proposal doesn't have any projects yet.</Text>
            </Alert>
            {canCreateProject && (
              <Flex gap="sm">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => router.push(`/bands/${bandSlug}/proposals/${proposalId}/projects`)}
                >
                  Create Projects
                </Button>
              </Flex>
            )}
          </Stack>
        )}
      </Stack>
    </Card>
  )
}