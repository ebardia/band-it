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
  Flex,
  Card,
  Badge,
  Loading,
  Alert,
  BandLayout,
  Input,
  Textarea,
  Modal,
  FileUpload,
  FileList,
  IntegrityBlockModal,
  IntegrityWarningModal,
} from '@/components/ui'
import { AppNav } from '@/components/AppNav'

const CAN_UPDATE = ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR']

export default function ChecklistItemDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { showToast } = useToast()
  const slug = params.slug as string
  const taskId = params.taskId as string
  const itemId = params.itemId as string

  const [userId, setUserId] = useState<string | null>(null)
  
  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false)
  const [editDescription, setEditDescription] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editAssigneeId, setEditAssigneeId] = useState<string | null>(null)
  const [editDueDate, setEditDueDate] = useState('')

  // Integrity Guard state
  const [validationIssues, setValidationIssues] = useState<any[]>([])
  const [showBlockModal, setShowBlockModal] = useState(false)
  const [showWarningModal, setShowWarningModal] = useState(false)
  const [pendingEditData, setPendingEditData] = useState<any>(null)

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

  const { data: itemData, isLoading, refetch } = trpc.checklist.getById.useQuery(
    { itemId },
    { enabled: !!itemId }
  )

  const updateMutation = trpc.checklist.update.useMutation({
    onSuccess: () => {
      showToast('Checklist item updated!', 'success')
      refetch()
      setShowEditModal(false)
    },
    onError: (error) => {
      showToast(error.message, 'error')
    }
  })

  const toggleMutation = trpc.checklist.toggle.useMutation({
    onSuccess: () => {
      showToast('Status updated!', 'success')
      refetch()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    }
  })

  const uploadFileMutation = trpc.file.upload.useMutation({
    onSuccess: () => {
      showToast('File uploaded!', 'success')
      refetch()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    }
  })

  const deleteFileMutation = trpc.file.delete.useMutation({
    onSuccess: () => {
      showToast('File deleted!', 'success')
      refetch()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    }
  })

  // Integrity Guard validation mutation
  const validationMutation = trpc.validation.check.useMutation()

  const handleOpenEditModal = () => {
    if (!itemData?.item) return
    const item = itemData.item
    setEditDescription(item.description)
    setEditNotes(item.notes || '')
    setEditAssigneeId(item.assigneeId || null)
    setEditDueDate(item.dueDate ? new Date(item.dueDate).toISOString().split('T')[0] : '')
    setShowEditModal(true)
  }

  const handleSaveEdit = async () => {
    if (!userId || !editDescription.trim()) return

    const editData = {
      itemId,
      userId,
      description: editDescription,
      notes: editNotes || null,
      assigneeId: editAssigneeId,
      dueDate: editDueDate ? new Date(editDueDate) : null,
    }

    // Store data for potential later use
    setPendingEditData(editData)

    // Run integrity validation
    try {
      const validation = await validationMutation.mutateAsync({
        entityType: 'ChecklistItem',
        action: 'update',
        bandId: itemData?.item?.task?.band?.id || '',
        data: {
          description: editDescription,
          notes: editNotes || null,
        },
        parentId: taskId,
      })

      if (!validation.canProceed) {
        // BLOCK - show block modal, cannot proceed
        setValidationIssues(validation.issues)
        setShowBlockModal(true)
        return
      }

      if (validation.issues.length > 0) {
        // FLAG - show warning modal, user can choose to proceed
        setValidationIssues(validation.issues)
        setShowWarningModal(true)
        return
      }

      // All clear - update checklist item normally
      updateMutation.mutate(editData)
    } catch (error) {
      // Validation failed - show error but don't update
      console.error('Validation error:', error)
      showToast('Unable to validate content. Please try again.', 'error')
    }
  }

  // Handle proceeding with warnings
  const handleProceedWithWarnings = () => {
    if (!pendingEditData) return

    updateMutation.mutate({
      ...pendingEditData,
      proceedWithFlags: true,
      flagReasons: validationIssues.map(i => `${i.type}_mismatch`),
      flagDetails: validationIssues,
    })

    // Close modal and clear state
    setShowWarningModal(false)
    setValidationIssues([])
    setPendingEditData(null)
  }

  // Handle canceling warning
  const handleCancelWarning = () => {
    setShowWarningModal(false)
    setValidationIssues([])
    setPendingEditData(null)
  }

  // Handle closing block modal
  const handleCloseBlock = () => {
    setShowBlockModal(false)
    setValidationIssues([])
    setPendingEditData(null)
    setShowEditModal(false) // Close the edit modal too
  }

  const handleToggle = () => {
    if (!userId) return
    toggleMutation.mutate({ itemId, userId })
  }

  const handleFileUpload = (file: { fileName: string; mimeType: string; base64Data: string }) => {
    if (!userId || !itemData?.item) return
    uploadFileMutation.mutate({
      fileName: file.fileName,
      mimeType: file.mimeType,
      base64Data: file.base64Data,
      checklistItemId: itemId,
      userId,
    })
  }

  const handleDeleteFile = (fileId: string) => {
    if (!userId) return
    deleteFileMutation.mutate({ fileId, userId })
  }

  if (isLoading) {
    return (
      <>
        <AppNav />
        <BandLayout
          bandSlug={slug}
          bandName="Loading..."
          pageTitle="Checklist Item"
          wide={true}
          isMember={false}
        >
          <Loading message="Loading checklist item..." />
        </BandLayout>
      </>
    )
  }

  if (!itemData?.item) {
    return (
      <>
        <AppNav />
        <BandLayout
          bandSlug={slug}
          bandName=""
          pageTitle="Checklist Item"
          isMember={false}
          wide={true}
        >
          <Alert variant="danger">
            <Text>Checklist item not found</Text>
          </Alert>
        </BandLayout>
      </>
    )
  }

  const item = itemData.item
  const task = item.task
  const band = task.band
  const members = band.members || []

  const currentMember = members.find((m: any) => m.user.id === userId)
  const canApprove = currentMember && band.whoCanApprove?.includes(currentMember.role)
  const isMember = !!currentMember
  const canUpdate = currentMember && CAN_UPDATE.includes(currentMember.role)
  const isAssignee = item.assigneeId === userId

  return (
    <>
      <AppNav />
      <BandLayout
        bandSlug={slug}
        bandName={band.name || ''}
        bandImageUrl={band.imageUrl}
        pageTitle={item.description}
        canApprove={canApprove || false}
        isMember={isMember}
        wide={true}
        action={
          (canUpdate || isAssignee) ? (
            <Button variant="secondary" size="md" onClick={handleOpenEditModal}>
              Edit Item
            </Button>
          ) : undefined
        }
      >
        <Stack spacing="lg">
          {/* Breadcrumb */}
          <Flex gap="sm" align="center" className="flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/bands/${slug}/tasks`)}
            >
              ← Tasks
            </Button>
            <Text color="muted">/</Text>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/bands/${slug}/tasks/${taskId}`)}
            >
              {task.name}
            </Button>
            <Text color="muted">/</Text>
            <Text variant="small" color="muted">Checklist Item</Text>
          </Flex>

          {/* Status & Info Card */}
          <Card>
            <Stack spacing="lg">
              <Flex gap="sm" align="center" className="flex-wrap">
                <Badge variant={item.isCompleted ? 'success' : 'warning'}>
                  {item.isCompleted ? '✓ Completed' : '○ Pending'}
                </Badge>
                {item.assignee && (
                  <Badge variant="info">Assigned: {item.assignee.name}</Badge>
                )}
                {item.dueDate && (
                  <Badge variant={new Date(item.dueDate) < new Date() && !item.isCompleted ? 'danger' : 'neutral'}>
                    Due: {new Date(item.dueDate).toLocaleDateString()}
                  </Badge>
                )}
                {item.files && item.files.length > 0 && (
                  <Badge variant="neutral">📎 {item.files.length} file(s)</Badge>
                )}
              </Flex>

              <Stack spacing="sm">
                <Text variant="small" weight="semibold" color="muted">Description</Text>
                <Text>{item.description}</Text>
              </Stack>

              {item.notes && (
                <Stack spacing="sm">
                  <Text variant="small" weight="semibold" color="muted">Notes</Text>
                  <Text style={{ whiteSpace: 'pre-wrap' }}>{item.notes}</Text>
                </Stack>
              )}

              <Flex gap="lg" className="flex-wrap">
                <Stack spacing="xs">
                  <Text variant="small" weight="semibold" color="muted">Created</Text>
                  <Text variant="small">{new Date(item.createdAt).toLocaleDateString()}</Text>
                </Stack>
                {item.completedAt && (
                  <Stack spacing="xs">
                    <Text variant="small" weight="semibold" color="muted">Completed</Text>
                    <Text variant="small">
                      {new Date(item.completedAt).toLocaleDateString()}
                      {item.completedBy && ` by ${item.completedBy.name}`}
                    </Text>
                  </Stack>
                )}
              </Flex>

              {/* Toggle completion */}
              {(canUpdate || isAssignee) && (
                <Flex>
                  <Button
                    variant={item.isCompleted ? 'secondary' : 'primary'}
                    onClick={handleToggle}
                    disabled={toggleMutation.isPending}
                  >
                    {toggleMutation.isPending
                      ? 'Updating...'
                      : item.isCompleted
                        ? 'Mark as Pending'
                        : 'Mark as Completed'
                    }
                  </Button>
                </Flex>
              )}
            </Stack>
          </Card>

          {/* Files Section */}
          <Card>
            <Stack spacing="md">
              <Heading level={3}>Attachments</Heading>
              
              {item.files && item.files.length > 0 ? (
                <FileList
                  files={item.files}
                  onDelete={handleDeleteFile}
                  canDelete={canUpdate || isAssignee}
                  currentUserId={userId}
                  isDeleting={deleteFileMutation.isPending}
                />
              ) : (
                <Text variant="small" color="muted">No files attached yet.</Text>
              )}

              {(canUpdate || isAssignee) && (
                <FileUpload
                  onUpload={handleFileUpload}
                  label="Upload File"
                  description="Attach proof, receipts, or related documents"
                  isUploading={uploadFileMutation.isPending}
                />
              )}
            </Stack>
          </Card>

          {/* Back to Task */}
          <Button
            variant="ghost"
            size="md"
            onClick={() => router.push(`/bands/${slug}/tasks/${taskId}`)}
          >
            ← Back to Task
          </Button>
        </Stack>

        {/* Edit Modal */}
        <Modal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          size="lg"
        >
          <Stack spacing="md">
            <Heading level={3}>Edit Checklist Item</Heading>

            <Stack spacing="sm">
              <Text variant="small" weight="semibold">Description *</Text>
              <Input
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="What needs to be done?"
              />
            </Stack>

            <Stack spacing="sm">
              <Text variant="small" weight="semibold">Notes</Text>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Additional details, instructions, or context..."
                rows={4}
              />
            </Stack>

            <Stack spacing="sm">
              <Text variant="small" weight="semibold">Assignee</Text>
              <Flex gap="sm" className="flex-wrap">
                <Button
                  variant={editAssigneeId === null ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setEditAssigneeId(null)}
                >
                  Unassigned
                </Button>
                {members.map((member: any) => (
                  <Button
                    key={member.user.id}
                    variant={editAssigneeId === member.user.id ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setEditAssigneeId(member.user.id)}
                  >
                    {member.user.name}
                  </Button>
                ))}
              </Flex>
            </Stack>

            <Stack spacing="sm">
              <Text variant="small" weight="semibold">Due Date</Text>
              <Input
                type="date"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
              />
            </Stack>

            <Flex gap="sm" justify="end">
              <Button variant="ghost" onClick={() => setShowEditModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveEdit}
                disabled={updateMutation.isPending || validationMutation.isPending || !editDescription.trim()}
              >
                {validationMutation.isPending ? 'Checking...' : updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </Flex>
          </Stack>
        </Modal>

        {/* Integrity Guard Modals */}
        <IntegrityBlockModal
          isOpen={showBlockModal}
          onClose={handleCloseBlock}
          issues={validationIssues}
        />

        <IntegrityWarningModal
          isOpen={showWarningModal}
          onClose={handleCancelWarning}
          onProceed={handleProceedWithWarnings}
          issues={validationIssues}
          isProceeding={updateMutation.isPending}
        />
      </BandLayout>
    </>
  )
}