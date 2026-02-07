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

interface DeliverableLink {
  url: string
  title: string
}

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
  const [editRequiresDeliverable, setEditRequiresDeliverable] = useState(false)

  // Integrity Guard state
  const [validationIssues, setValidationIssues] = useState<any[]>([])
  const [showBlockModal, setShowBlockModal] = useState(false)
  const [showWarningModal, setShowWarningModal] = useState(false)
  const [pendingEditData, setPendingEditData] = useState<any>(null)

  // Deliverable state
  const [summary, setSummary] = useState('')
  const [links, setLinks] = useState<DeliverableLink[]>([])
  const [nextSteps, setNextSteps] = useState('')
  const [newLinkUrl, setNewLinkUrl] = useState('')
  const [newLinkTitle, setNewLinkTitle] = useState('')

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

  // Fetch deliverable data
  const { data: deliverableData, refetch: refetchDeliverable } = trpc.checklist.getDeliverable.useQuery(
    { checklistItemId: itemId },
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

  const deleteItemMutation = trpc.checklist.delete.useMutation({
    onSuccess: () => {
      showToast('Checklist item deleted!', 'success')
      router.push(`/bands/${slug}/tasks/${taskId}`)
    },
    onError: (error) => {
      showToast(error.message, 'error')
    }
  })

  // Integrity Guard validation mutation
  const validationMutation = trpc.validation.check.useMutation()

  // Deliverable mutations
  // @ts-ignore - tRPC type instantiation depth issue
  const updateDeliverableMutation = trpc.checklist.updateDeliverable.useMutation({
    onSuccess: () => {
      showToast('Deliverable saved!', 'success')
      refetch()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    }
  })

  const submitMutation = trpc.checklist.submit.useMutation({
    onSuccess: () => {
      showToast('Submitted for verification!', 'success')
      refetch()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    }
  })

  const retryMutation = trpc.checklist.retry.useMutation({
    onSuccess: () => {
      showToast('Resubmitted for verification!', 'success')
      refetch()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    }
  })

  // Populate deliverable form with existing data
  useEffect(() => {
    if (deliverableData?.deliverable) {
      setSummary(deliverableData.deliverable.summary || '')
      const existingLinks = deliverableData.deliverable.links
      if (Array.isArray(existingLinks)) {
        setLinks(existingLinks as unknown as DeliverableLink[])
      }
      setNextSteps(deliverableData.deliverable.nextSteps || '')
    }
  }, [deliverableData])

  const handleOpenEditModal = () => {
    if (!itemData?.item) return
    const item = itemData.item
    setEditDescription(item.description)
    setEditNotes(item.notes || '')
    setEditAssigneeId(item.assigneeId || null)
    setEditDueDate(item.dueDate ? new Date(item.dueDate).toISOString().split('T')[0] : '')
    setEditRequiresDeliverable(item.requiresDeliverable || false)
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
      requiresDeliverable: editRequiresDeliverable,
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
    if (!userId || !itemData?.item) return

    const isMarkingComplete = !itemData.item.isCompleted

    // If marking complete and there's a summary, include deliverable data
    if (isMarkingComplete && summary.trim()) {
      toggleMutation.mutate({
        itemId,
        userId,
        deliverable: {
          summary: summary.trim(),
          links: links.length > 0 ? links : undefined,
          nextSteps: nextSteps.trim() || undefined,
        },
      })
    } else {
      toggleMutation.mutate({ itemId, userId })
    }
  }

  const handleDelete = () => {
    if (!userId) return
    if (!window.confirm('Are you sure you want to delete this checklist item? This action cannot be undone.')) return
    deleteItemMutation.mutate({ itemId, userId })
  }

  const handleAddLink = () => {
    if (!newLinkUrl.trim() || !newLinkTitle.trim()) {
      showToast('Please enter both URL and title', 'error')
      return
    }
    try {
      new URL(newLinkUrl)
    } catch {
      showToast('Please enter a valid URL', 'error')
      return
    }
    setLinks(prev => [...prev, { url: newLinkUrl.trim(), title: newLinkTitle.trim() }])
    setNewLinkUrl('')
    setNewLinkTitle('')
  }

  const handleRemoveLink = (index: number) => {
    setLinks(prev => prev.filter((_, i) => i !== index))
  }

  const handleSaveDeliverable = async () => {
    if (!userId) return

    if (summary.trim().length < 30) {
      showToast('Summary must be at least 30 characters', 'error')
      return
    }

    updateDeliverableMutation.mutate({
      checklistItemId: itemId,
      userId,
      summary: summary.trim(),
      links: links.length > 0 ? links : undefined,
      nextSteps: nextSteps.trim() || null,
    })
  }

  const handleSubmitForVerification = async () => {
    if (!userId || !itemData?.item) return

    const requiresDeliverable = itemData.item.requiresDeliverable

    // Validate deliverable if required
    if (requiresDeliverable) {
      if (!summary.trim()) {
        showToast('Please enter a summary of what was accomplished', 'error')
        return
      }
      if (summary.trim().length < 30) {
        showToast('Summary must be at least 30 characters', 'error')
        return
      }
    }

    try {
      // Save deliverable first if summary is provided
      if (summary.trim()) {
        await updateDeliverableMutation.mutateAsync({
          checklistItemId: itemId,
          userId,
          summary: summary.trim(),
          links: links.length > 0 ? links : undefined,
          nextSteps: nextSteps.trim() || null,
        })
      }

      // Now submit for verification
      submitMutation.mutate({ itemId, userId })
    } catch (error) {
      // Error already handled by mutation onError
    }
  }

  const handleRetry = async () => {
    if (!userId || !itemData?.item) return

    const requiresDeliverable = itemData.item.requiresDeliverable

    // Validate deliverable if required
    if (requiresDeliverable) {
      if (!summary.trim()) {
        showToast('Please enter a summary of what was accomplished', 'error')
        return
      }
      if (summary.trim().length < 30) {
        showToast('Summary must be at least 30 characters', 'error')
        return
      }
    }

    try {
      // Save deliverable first if summary is provided
      if (summary.trim()) {
        await updateDeliverableMutation.mutateAsync({
          checklistItemId: itemId,
          userId,
          summary: summary.trim(),
          links: links.length > 0 ? links : undefined,
          nextSteps: nextSteps.trim() || null,
        })
      }

      // Now retry submission
      retryMutation.mutate({ itemId, userId })
    } catch (error) {
      // Error already handled by mutation onError
    }
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

              {/* Actions */}
              {(canUpdate || isAssignee) && (() => {
                const needsDeliverable = item.requiresDeliverable && !item.isCompleted && summary.trim().length < 30
                return (
                  <Stack spacing="sm">
                    <Flex gap="sm" className="flex-wrap">
                      <Button
                        variant="secondary"
                        onClick={handleOpenEditModal}
                      >
                        Edit Item
                      </Button>
                      <Button
                        variant={item.isCompleted ? 'secondary' : 'primary'}
                        onClick={handleToggle}
                        disabled={toggleMutation.isPending || needsDeliverable}
                      >
                        {toggleMutation.isPending
                          ? 'Updating...'
                          : item.isCompleted
                            ? 'Mark as Pending'
                            : 'Mark as Completed'
                        }
                      </Button>
                      <Button
                        variant="danger"
                        onClick={handleDelete}
                        disabled={deleteItemMutation.isPending}
                      >
                        {deleteItemMutation.isPending ? 'Deleting...' : 'Delete'}
                      </Button>
                    </Flex>
                    {needsDeliverable && (
                      <Text variant="small" color="muted">
                        Fill in the deliverable section below (min 30 chars) before completing
                      </Text>
                    )}
                  </Stack>
                )
              })()}
            </Stack>
          </Card>

          {/* Deliverable Section - shown when user can complete and item requires deliverable or has one */}
          {(isAssignee || canUpdate) && (item.requiresDeliverable || deliverableData?.deliverable) && (
            <Card>
              <Stack spacing="md">
                <Flex justify="between" align="center">
                  <Heading level={3}>
                    Deliverable {item.requiresDeliverable && <span className="text-red-500">*</span>}
                  </Heading>
                  {deliverableData?.deliverable && (
                    <Badge variant="success">Saved</Badge>
                  )}
                </Flex>

                {item.verificationStatus === 'REJECTED' && item.rejectionReason && (
                  <Alert variant="danger">
                    <Text weight="semibold">Feedback from reviewer:</Text>
                    <Text>{item.rejectionReason}</Text>
                  </Alert>
                )}

                <Stack spacing="sm">
                  <Flex justify="between" align="center">
                    <Text variant="small" weight="semibold">
                      What was accomplished?
                    </Text>
                    <Text variant="small" color="muted">
                      {summary.trim().length}/30 min
                    </Text>
                  </Flex>
                  <Textarea
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="Describe the work completed, decisions made, outcomes achieved..."
                    rows={4}
                  />
                  {item.requiresDeliverable && summary.trim().length > 0 && summary.trim().length < 30 && (
                    <Text variant="small" color="muted" className="text-red-500">
                      Summary must be at least 30 characters ({30 - summary.trim().length} more needed)
                    </Text>
                  )}
                </Stack>

                {/* Links */}
                <Stack spacing="sm">
                  <Text variant="small" weight="semibold">Related Links (optional)</Text>

                  {links.length > 0 && (
                    <Stack spacing="xs">
                      {links.map((link, index) => (
                        <Flex key={index} gap="sm" align="center" className="bg-gray-50 p-2 rounded">
                          <div className="flex-1 min-w-0">
                            <Text variant="small" weight="semibold" className="truncate">{link.title}</Text>
                            <Text variant="small" color="muted" className="truncate">{link.url}</Text>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveLink(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            Remove
                          </Button>
                        </Flex>
                      ))}
                    </Stack>
                  )}

                  <Flex gap="sm" className="flex-wrap md:flex-nowrap">
                    <Input
                      type="url"
                      value={newLinkUrl}
                      onChange={(e) => setNewLinkUrl(e.target.value)}
                      placeholder="https://..."
                    />
                    <Input
                      type="text"
                      value={newLinkTitle}
                      onChange={(e) => setNewLinkTitle(e.target.value)}
                      placeholder="Link title"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleAddLink}
                      disabled={!newLinkUrl.trim() || !newLinkTitle.trim()}
                    >
                      Add
                    </Button>
                  </Flex>
                </Stack>

                {/* Next Steps */}
                <Stack spacing="sm">
                  <Text variant="small" weight="semibold">Next Steps / Notes for Future (optional)</Text>
                  <Textarea
                    value={nextSteps}
                    onChange={(e) => setNextSteps(e.target.value)}
                    placeholder="Any follow-up work needed, lessons learned, or notes for whoever picks this up next..."
                    rows={2}
                  />
                </Stack>

                {/* Action buttons */}
                <Flex gap="sm" className="flex-wrap">
                  <Button
                    variant="secondary"
                    onClick={handleSaveDeliverable}
                    disabled={updateDeliverableMutation.isPending || summary.trim().length < 30}
                  >
                    {updateDeliverableMutation.isPending ? 'Saving...' : 'Save Deliverable'}
                  </Button>

                  {item.requiresVerification && !item.isCompleted && item.verificationStatus !== 'PENDING' && (
                    <Button
                      variant="primary"
                      onClick={handleSubmitForVerification}
                      disabled={
                        submitMutation.isPending ||
                        updateDeliverableMutation.isPending ||
                        (item.requiresDeliverable && summary.trim().length < 30)
                      }
                    >
                      {submitMutation.isPending ? 'Submitting...' : 'Submit for Verification'}
                    </Button>
                  )}

                  {item.verificationStatus === 'REJECTED' && (
                    <Button
                      variant="primary"
                      onClick={handleRetry}
                      disabled={
                        retryMutation.isPending ||
                        updateDeliverableMutation.isPending ||
                        (item.requiresDeliverable && summary.trim().length < 30)
                      }
                    >
                      {retryMutation.isPending ? 'Resubmitting...' : 'Resubmit for Verification'}
                    </Button>
                  )}
                </Flex>
              </Stack>
            </Card>
          )}

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

            <Flex gap="sm" align="center">
              <input
                type="checkbox"
                id="editRequiresDeliverable"
                checked={editRequiresDeliverable}
                onChange={(e) => setEditRequiresDeliverable(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="editRequiresDeliverable" className="text-sm text-gray-600">
                Requires deliverable (summary of work when completing)
              </label>
            </Flex>

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