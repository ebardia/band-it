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
import { ChecklistItemHeaderCompact } from './components/ChecklistItemHeaderCompact'

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

  // Dismiss modal state
  const [showDismissModal, setShowDismissModal] = useState(false)
  const [dismissReason, setDismissReason] = useState('')

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

  // Expense state
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseNote, setExpenseNote] = useState('')

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

  // Fetch dismissal stats (for project leads/conductors)
  const { data: dismissalData } = trpc.checklist.getDismissals.useQuery(
    { itemId, userId: userId! },
    { enabled: !!itemId && !!userId }
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

  const claimMutation = trpc.checklist.claim.useMutation({
    onSuccess: () => {
      showToast('Item claimed!', 'success')
      refetch()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    }
  })

  const dismissMutation = trpc.checklist.dismiss.useMutation({
    onSuccess: (data) => {
      showToast('Item dismissed from your quick actions', 'success')
      setShowDismissModal(false)
      setDismissReason('')
      // Navigate back to task page since item is now dismissed
      router.push(`/bands/${slug}/tasks/${taskId}`)
    },
    onError: (error) => {
      showToast(error.message, 'error')
    }
  })

  // Reimbursement mutations
  const reimburseMutation = trpc.checklist.reimburse.useMutation({
    onSuccess: () => {
      showToast('Marked as reimbursed!', 'success')
      refetch()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    }
  })

  const confirmReimbursementMutation = trpc.checklist.confirmReimbursement.useMutation({
    onSuccess: () => {
      showToast('Reimbursement confirmed!', 'success')
      refetch()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    }
  })

  const disputeReimbursementMutation = trpc.checklist.disputeReimbursement.useMutation({
    onSuccess: () => {
      showToast('Dispute submitted', 'success')
      refetch()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    }
  })

  const handleClaim = () => {
    if (!userId) return
    claimMutation.mutate({ itemId, userId })
  }

  const handleDismiss = () => {
    setShowDismissModal(true)
  }

  const handleConfirmDismiss = () => {
    if (!userId || !dismissReason.trim()) return
    dismissMutation.mutate({ itemId, userId, reason: dismissReason.trim() })
  }

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

  // Handle closing block modal - keep edit modal open so user can edit and retry
  const handleCloseBlock = () => {
    setShowBlockModal(false)
    setValidationIssues([])
    setPendingEditData(null)
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
    if (!userId) return
    try {
      new URL(newLinkUrl)
    } catch {
      showToast('Please enter a valid URL', 'error')
      return
    }
    const newLink = { url: newLinkUrl.trim(), title: newLinkTitle.trim() }
    const updatedLinks = [...links, newLink]

    // Update local state immediately for responsiveness
    setLinks(updatedLinks)
    setNewLinkUrl('')
    setNewLinkTitle('')

    // Save to backend immediately
    updateDeliverableMutation.mutate({
      checklistItemId: itemId,
      userId,
      summary: summary.trim() || undefined,
      links: updatedLinks,
      nextSteps: nextSteps.trim() || null,
    })
  }

  const handleRemoveLink = (index: number) => {
    if (!userId) return
    const updatedLinks = links.filter((_, i) => i !== index)

    // Update local state immediately
    setLinks(updatedLinks)

    // Save to backend immediately
    updateDeliverableMutation.mutate({
      checklistItemId: itemId,
      userId,
      summary: summary.trim() || undefined,
      links: updatedLinks,
      nextSteps: nextSteps.trim() || null,
    })
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

      // Now submit for verification (with expense data if provided)
      const expenseAmountCents = expenseAmount ? Math.round(parseFloat(expenseAmount) * 100) : undefined
      submitMutation.mutate({
        itemId,
        userId,
        expenseAmount: expenseAmountCents,
        expenseNote: expenseNote.trim() || undefined,
      })
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
        <Stack spacing="md">
          {/* Breadcrumb */}
          <Flex gap="sm" align="center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/bands/${slug}/tasks/${taskId}`)}
            >
              ← {task.name}
            </Button>
          </Flex>

          {/* Compact Header */}
          <Card>
            <ChecklistItemHeaderCompact
              item={item}
              task={task}
              bandSlug={slug}
              canUpdate={!!canUpdate}
              isAssignee={isAssignee}
              isMember={isMember}
              onEdit={handleOpenEditModal}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onClaim={handleClaim}
              onDismiss={handleDismiss}
              isToggling={toggleMutation.isPending}
              isDeleting={deleteItemMutation.isPending}
              isClaiming={claimMutation.isPending}
              isDismissing={dismissMutation.isPending}
              needsDeliverable={item.requiresDeliverable && !item.isCompleted && summary.trim().length < 30}
            />
          </Card>

          {/* Dismissal Stats - shown to project leads and conductors */}
          {dismissalData?.canView && dismissalData.dismissedCount > 0 && !item.assigneeId && (
            <div className="border border-orange-200 rounded-lg bg-orange-50 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-orange-800">
                  Dismissals ({dismissalData.dismissedCount}/{dismissalData.eligibleCount} eligible)
                </span>
                {dismissalData.dismissedCount === dismissalData.eligibleCount && (
                  <Badge variant="warning">All dismissed</Badge>
                )}
              </div>
              <div className="space-y-1">
                {dismissalData.dismissals.map((d: any) => (
                  <div key={d.id} className="text-xs text-orange-700 flex items-center gap-2">
                    <span className="font-medium">{d.user.name}:</span>
                    <span className="text-orange-600">{d.reason}</span>
                  </div>
                ))}
              </div>
              {dismissalData.dismissedCount === dismissalData.eligibleCount && (
                <Text variant="small" className="mt-2 text-orange-700">
                  Consider manually assigning this item to someone.
                </Text>
              )}
            </div>
          )}

          {/* Compact Deliverable Section */}
          {(isAssignee || canUpdate) && (item.requiresDeliverable || deliverableData?.deliverable) && (
            <div className="border border-gray-200 rounded-lg bg-white p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Deliverable {item.requiresDeliverable && <span className="text-red-500">*</span>}
                </span>
                <div className="flex items-center gap-2">
                  {deliverableData?.deliverable && (
                    <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Saved</span>
                  )}
                  <span className="text-xs text-gray-500">{summary.trim().length}/30</span>
                </div>
              </div>

              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Describe the work completed..."
                rows={3}
                className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />

              {/* Links - compact */}
              {links.length > 0 && (
                <div className="space-y-1">
                  {links.map((link, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 px-2 py-1 rounded text-xs">
                      <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">
                        {link.title}
                      </a>
                      <button
                        onClick={() => handleRemoveLink(index)}
                        className="text-red-500 hover:text-red-700 ml-2"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 flex-wrap">
                <input
                  type="url"
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  placeholder="https://..."
                  className="flex-1 min-w-[120px] text-sm px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={newLinkTitle}
                  onChange={(e) => setNewLinkTitle(e.target.value)}
                  placeholder="Title"
                  className="flex-1 min-w-[80px] text-sm px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  onClick={handleAddLink}
                  disabled={!newLinkUrl.trim() || !newLinkTitle.trim()}
                  className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
                >
                  + Link
                </button>
              </div>

              <textarea
                value={nextSteps}
                onChange={(e) => setNextSteps(e.target.value)}
                placeholder="Next steps / notes for future (optional)..."
                rows={2}
                className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />

              {/* Expense Input Section */}
              {!item.expenseAmount && item.verificationStatus !== 'APPROVED' && (
                <div className="border-t border-gray-100 pt-3 mt-2">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-gray-700">Expense (if any)</span>
                    <span className="text-xs text-gray-400">Optional - for reimbursement tracking</span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <div className="flex items-center gap-1">
                      <span className="text-gray-500">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={expenseAmount}
                        onChange={(e) => setExpenseAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-24 text-sm px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <input
                      type="text"
                      value={expenseNote}
                      onChange={(e) => setExpenseNote(e.target.value)}
                      placeholder="What was the expense for?"
                      className="flex-1 min-w-[150px] text-sm px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={handleSaveDeliverable}
                  disabled={updateDeliverableMutation.isPending || summary.trim().length < 30}
                  className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
                >
                  {updateDeliverableMutation.isPending ? 'Saving...' : 'Save'}
                </button>

                {item.requiresVerification && !item.isCompleted && item.verificationStatus !== 'PENDING' && (
                  <button
                    onClick={handleSubmitForVerification}
                    disabled={submitMutation.isPending || updateDeliverableMutation.isPending || (item.requiresDeliverable && summary.trim().length < 30)}
                    className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submitMutation.isPending ? 'Submitting...' : 'Submit for Verification'}
                  </button>
                )}

                {item.verificationStatus === 'REJECTED' && (
                  <button
                    onClick={handleRetry}
                    disabled={retryMutation.isPending || updateDeliverableMutation.isPending || (item.requiresDeliverable && summary.trim().length < 30)}
                    className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {retryMutation.isPending ? 'Resubmitting...' : 'Resubmit'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Expense/Reimbursement Status Section */}
          {item.expenseAmount !== null && item.expenseAmount > 0 && (
            <div className={`border rounded-lg p-3 space-y-2 ${
              item.reimbursementStatus === 'CONFIRMED' ? 'border-green-200 bg-green-50' :
              item.reimbursementStatus === 'DISPUTED' ? 'border-red-200 bg-red-50' :
              item.reimbursementStatus === 'REIMBURSED' ? 'border-blue-200 bg-blue-50' :
              'border-yellow-200 bg-yellow-50'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Expense</span>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  item.reimbursementStatus === 'CONFIRMED' ? 'bg-green-200 text-green-800' :
                  item.reimbursementStatus === 'DISPUTED' ? 'bg-red-200 text-red-800' :
                  item.reimbursementStatus === 'REIMBURSED' ? 'bg-blue-200 text-blue-800' :
                  'bg-yellow-200 text-yellow-800'
                }`}>
                  {item.reimbursementStatus === 'CONFIRMED' ? '✓ Confirmed' :
                   item.reimbursementStatus === 'DISPUTED' ? '⚠ Disputed' :
                   item.reimbursementStatus === 'REIMBURSED' ? '💸 Reimbursed' :
                   '⏳ Awaiting Reimbursement'}
                </span>
              </div>

              <div className="flex items-center gap-4 text-sm">
                <span className="font-semibold text-lg">${(item.expenseAmount / 100).toFixed(2)}</span>
                {item.expenseNote && <span className="text-gray-600">{item.expenseNote}</span>}
              </div>

              {item.reimbursedBy && (
                <div className="text-xs text-gray-500">
                  Reimbursed by {item.reimbursedBy.name}
                  {item.reimbursedAt && ` on ${new Date(item.reimbursedAt).toLocaleDateString()}`}
                  {item.reimbursementNote && `: "${item.reimbursementNote}"`}
                </div>
              )}

              {/* Treasurer Actions: Mark as Reimbursed */}
              {item.reimbursementStatus === 'PENDING' && currentMember && ['FOUNDER', 'GOVERNOR', 'TREASURER'].includes(currentMember.role) && (
                <div className="flex gap-2 pt-2 border-t border-gray-200">
                  <button
                    onClick={() => {
                      const note = prompt('Add a note (e.g., "Paid via Venmo"):')
                      if (note !== null && userId) {
                        reimburseMutation.mutate({ itemId, userId, note: note || undefined })
                      }
                    }}
                    disabled={reimburseMutation.isPending}
                    className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {reimburseMutation.isPending ? '...' : 'Mark as Reimbursed'}
                  </button>
                </div>
              )}

              {/* Member Actions: Confirm or Dispute */}
              {item.reimbursementStatus === 'REIMBURSED' && isAssignee && (
                <div className="flex gap-2 pt-2 border-t border-gray-200">
                  <button
                    onClick={() => {
                      if (userId) {
                        confirmReimbursementMutation.mutate({ itemId, userId })
                      }
                    }}
                    disabled={confirmReimbursementMutation.isPending}
                    className="text-xs px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    {confirmReimbursementMutation.isPending ? '...' : 'Confirm Receipt'}
                  </button>
                  <button
                    onClick={() => {
                      const reason = prompt('Why are you disputing this reimbursement? (min 10 characters)')
                      if (reason && reason.length >= 10 && userId) {
                        disputeReimbursementMutation.mutate({ itemId, userId, reason })
                      } else if (reason && reason.length < 10) {
                        showToast('Reason must be at least 10 characters', 'error')
                      }
                    }}
                    disabled={disputeReimbursementMutation.isPending}
                    className="text-xs px-3 py-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
                  >
                    {disputeReimbursementMutation.isPending ? '...' : 'Dispute'}
                  </button>
                </div>
              )}

              {item.reimbursementStatus === 'CONFIRMED' && item.reimbursementConfirmedAt && (
                <div className="text-xs text-green-600">
                  Confirmed on {new Date(item.reimbursementConfirmedAt).toLocaleDateString()}
                </div>
              )}
            </div>
          )}

          {/* Compact Files Section */}
          <div className="border border-gray-200 rounded-lg bg-white p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                Attachments {item.files && item.files.length > 0 && `(${item.files.length})`}
              </span>
            </div>

            {item.files && item.files.length > 0 ? (
              <FileList
                files={item.files}
                onDelete={handleDeleteFile}
                canDelete={canUpdate || isAssignee}
                currentUserId={userId}
                isDeleting={deleteFileMutation.isPending}
              />
            ) : (
              <Text variant="small" color="muted">No files attached.</Text>
            )}

            {(canUpdate || isAssignee) && (
              <FileUpload
                onUpload={handleFileUpload}
                label="Upload"
                description="Attach proof or documents"
                isUploading={uploadFileMutation.isPending}
              />
            )}
          </div>
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
          bandId={band?.id}
          userId={userId || undefined}
          userRole={currentMember?.role}
        />

        <IntegrityWarningModal
          isOpen={showWarningModal}
          onClose={handleCancelWarning}
          onProceed={handleProceedWithWarnings}
          issues={validationIssues}
          isProceeding={updateMutation.isPending}
          bandId={band?.id}
          userId={userId || undefined}
          userRole={currentMember?.role}
        />

        {/* Dismiss Modal */}
        <Modal
          isOpen={showDismissModal}
          onClose={() => {
            setShowDismissModal(false)
            setDismissReason('')
          }}
          size="md"
        >
          <Stack spacing="md">
            <Heading level={3}>Dismiss Item</Heading>
            <Text color="muted">
              This will hide the item from your quick actions. You can still see it here if you navigate directly.
              Other members will still see it in their quick actions.
            </Text>

            <Stack spacing="sm">
              <Text variant="small" weight="semibold">Why are you dismissing this item? *</Text>
              <select
                value={dismissReason}
                onChange={(e) => setDismissReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a reason...</option>
                <option value="Not my expertise">Not my expertise</option>
                <option value="Too busy right now">Too busy right now</option>
                <option value="Not relevant to my role">Not relevant to my role</option>
                <option value="Someone else is better suited">Someone else is better suited</option>
                <option value="Other">Other</option>
              </select>
              {dismissReason === 'Other' && (
                <Input
                  placeholder="Please specify..."
                  value=""
                  onChange={(e) => setDismissReason(e.target.value || 'Other')}
                />
              )}
            </Stack>

            <Flex gap="sm" justify="end">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowDismissModal(false)
                  setDismissReason('')
                }}
              >
                Cancel
              </Button>
              <Button
                variant="secondary"
                onClick={handleConfirmDismiss}
                disabled={dismissMutation.isPending || !dismissReason.trim()}
              >
                {dismissMutation.isPending ? 'Dismissing...' : 'Dismiss'}
              </Button>
            </Flex>
          </Stack>
        </Modal>
      </BandLayout>
    </>
  )
}