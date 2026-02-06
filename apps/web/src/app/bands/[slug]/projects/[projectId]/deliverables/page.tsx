'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { jwtDecode } from 'jwt-decode'
import {
  Heading,
  Text,
  Stack,
  Flex,
  Button,
  Card,
  Loading,
  Alert,
  BandLayout,
  Input,
  Badge,
} from '@/components/ui'
import { AppNav } from '@/components/AppNav'

interface DeliverableLink {
  url: string
  title: string
}

interface DeliverableFile {
  id: string
  filename: string
  originalName: string
  mimeType: string
  size: number
  url: string
  category: string
}

interface Deliverable {
  id: string
  summary: string
  links: DeliverableLink[] | null
  nextSteps: string | null
  createdAt: string
  updatedAt: string
  type: 'task' | 'checklist'
  itemName: string
  itemId: string
  itemStatus: string
  itemVerificationStatus: string | null
  itemCompletedAt: string | null
  itemAssignee: {
    id: string
    name: string
  } | null
  parentTask: {
    id: string
    name: string
  } | null
  createdBy: {
    id: string
    name: string
  }
  files: DeliverableFile[]
}

function DeliverableCard({ deliverable }: { deliverable: Deliverable }) {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  const links = (deliverable.links || []) as DeliverableLink[]

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // Determine navigation URL based on type
  const getItemUrl = () => {
    if (deliverable.type === 'task') {
      return `/bands/${slug}/tasks/${deliverable.itemId}`
    } else {
      // Checklist item - navigate to the parent task with checklist item ID
      return `/bands/${slug}/tasks/${deliverable.parentTask?.id}/checklist/${deliverable.itemId}`
    }
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <Stack spacing="md">
        {/* Header */}
        <Flex justify="between" align="start" className="flex-wrap gap-2">
          <div>
            {deliverable.type === 'checklist' && deliverable.parentTask && (
              <Text variant="small" color="muted" className="mb-1">
                Task: {deliverable.parentTask.name}
              </Text>
            )}
            <div
              className="cursor-pointer hover:text-blue-600"
              onClick={() => router.push(getItemUrl())}
            >
              <Flex gap="sm" align="center">
                {deliverable.type === 'checklist' && (
                  <Badge variant="neutral" className="text-xs">Checklist</Badge>
                )}
                <Text weight="semibold" className="text-lg">
                  {deliverable.itemName}
                </Text>
              </Flex>
            </div>
          </div>
          <Flex gap="sm">
            {deliverable.itemVerificationStatus === 'APPROVED' && (
              <Badge variant="success">Verified</Badge>
            )}
            {deliverable.itemVerificationStatus === 'PENDING' && (
              <Badge variant="warning">Pending Review</Badge>
            )}
            {deliverable.itemVerificationStatus === 'REJECTED' && (
              <Badge variant="danger">Rejected</Badge>
            )}
          </Flex>
        </Flex>

        {/* Summary */}
        <div className="bg-gray-50 rounded-lg p-4">
          <Text className="whitespace-pre-wrap">{deliverable.summary}</Text>
        </div>

        {/* Links */}
        {links.length > 0 && (
          <Stack spacing="xs">
            <Text variant="small" weight="semibold" color="muted">Related Links</Text>
            <Flex gap="sm" className="flex-wrap">
              {links.map((link, idx) => (
                <a
                  key={idx}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 text-sm underline"
                >
                  {link.title}
                </a>
              ))}
            </Flex>
          </Stack>
        )}

        {/* Files */}
        {deliverable.files.length > 0 && (
          <Stack spacing="xs">
            <Text variant="small" weight="semibold" color="muted">Attached Files</Text>
            <Flex gap="sm" className="flex-wrap">
              {deliverable.files.map((file) => (
                <a
                  key={file.id}
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 rounded px-3 py-2 text-sm transition-colors"
                >
                  <span>{file.originalName}</span>
                  <span className="text-gray-500">({formatFileSize(file.size)})</span>
                </a>
              ))}
            </Flex>
          </Stack>
        )}

        {/* Next Steps */}
        {deliverable.nextSteps && (
          <Stack spacing="xs">
            <Text variant="small" weight="semibold" color="muted">Next Steps / Notes</Text>
            <Text variant="small" className="text-gray-600 italic">
              {deliverable.nextSteps}
            </Text>
          </Stack>
        )}

        {/* Meta */}
        <Flex justify="between" align="center" className="pt-2 border-t border-gray-100">
          <Text variant="small" color="muted">
            By {deliverable.createdBy.name}
            {deliverable.itemAssignee && deliverable.itemAssignee.id !== deliverable.createdBy.id && (
              <span> (assigned to {deliverable.itemAssignee.name})</span>
            )}
          </Text>
          <Text variant="small" color="muted">
            {deliverable.itemCompletedAt
              ? `Completed ${formatDate(deliverable.itemCompletedAt)}`
              : `Updated ${formatDate(deliverable.updatedAt)}`
            }
          </Text>
        </Flex>
      </Stack>
    </Card>
  )
}

export default function ProjectDeliverablesPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  const projectId = params.projectId as string

  const [userId, setUserId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const limit = 10

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

  const { data: projectData, isLoading: projectLoading } = trpc.project.getById.useQuery(
    { projectId },
    { enabled: !!projectId }
  )

  const { data: deliverablesData, isLoading: deliverablesLoading } = trpc.project.getDeliverables.useQuery(
    { projectId, search: search || undefined, page, limit },
    { enabled: !!projectId }
  )

  if (projectLoading) {
    return (
      <>
        <AppNav />
        <BandLayout
          bandSlug={slug}
          bandName="Loading..."
          pageTitle="Deliverables"
          isMember={false}
          wide={true}
        >
          <Loading message="Loading project..." />
        </BandLayout>
      </>
    )
  }

  if (!projectData?.project) {
    return (
      <>
        <AppNav />
        <BandLayout
          bandSlug={slug}
          bandName=""
          pageTitle="Deliverables"
          isMember={false}
          wide={true}
        >
          <Alert variant="danger">
            <Text>Project not found</Text>
          </Alert>
        </BandLayout>
      </>
    )
  }

  const project = projectData.project
  const band = project.band
  const currentMember = band.members.find((m: any) => m.user.id === userId)
  // @ts-ignore - tRPC type instantiation depth issue
  const deliverables = (deliverablesData?.deliverables || []) as Deliverable[]
  const pagination = deliverablesData?.pagination

  return (
    <>
      <AppNav />
      <BandLayout
        bandSlug={slug}
        bandName={band.name}
        bandImageUrl={band.imageUrl}
        pageTitle={`${project.name} - Deliverables`}
        isMember={!!currentMember}
        wide={true}
      >
        <Stack spacing="lg">
          {/* Breadcrumb */}
          <Flex gap="sm" align="center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/bands/${slug}/projects/${projectId}`)}
            >
              ← Back to Project
            </Button>
          </Flex>

          <Card>
            <Stack spacing="md">
              <Flex justify="between" align="center" className="flex-wrap gap-4">
                <div>
                  <Heading level={2}>Project Deliverables</Heading>
                  <Text color="muted">
                    Knowledge captured from completed tasks in this project
                  </Text>
                </div>
                <div className="w-full md:w-72">
                  <Input
                    type="text"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value)
                      setPage(1)
                    }}
                    placeholder="Search deliverables..."
                  />
                </div>
              </Flex>
            </Stack>
          </Card>

          {deliverablesLoading ? (
            <Loading message="Loading deliverables..." />
          ) : deliverables.length === 0 ? (
            <Card>
              <Stack spacing="md" className="text-center py-8">
                <Text color="muted">
                  {search
                    ? 'No deliverables match your search.'
                    : 'No deliverables yet. Deliverables are created when tasks are completed.'
                  }
                </Text>
                <Button
                  variant="ghost"
                  onClick={() => router.push(`/bands/${slug}/projects/${projectId}`)}
                >
                  View Project Tasks
                </Button>
              </Stack>
            </Card>
          ) : (
            <>
              <Stack spacing="md">
                {deliverables.map((deliverable) => (
                  <DeliverableCard key={deliverable.id} deliverable={deliverable} />
                ))}
              </Stack>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <Flex justify="center" gap="sm">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Text className="py-2">
                    Page {pagination.page} of {pagination.totalPages}
                  </Text>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                    disabled={page === pagination.totalPages}
                  >
                    Next
                  </Button>
                </Flex>
              )}
            </>
          )}
        </Stack>
      </BandLayout>
    </>
  )
}
