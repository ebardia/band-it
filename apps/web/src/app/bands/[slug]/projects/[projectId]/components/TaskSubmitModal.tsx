'use client'

import { useState, useEffect } from 'react'
import { trpc } from '@/lib/trpc'
import {
  Heading,
  Text,
  Stack,
  Flex,
  Button,
  Modal,
  Alert,
  Input,
  FileUpload,
  FileList,
  useToast,
} from '@/components/ui'

interface UploadedFile {
  id: string
  originalName: string
  mimeType: string
  size: number
  url: string
  category: string
  createdAt: string
  uploadedBy?: {
    id: string
    name: string
  }
}

interface DeliverableLink {
  url: string
  title: string
}

interface TaskSubmitModalProps {
  isOpen: boolean
  task: any
  userId: string | null
  onClose: () => void
  onSubmit: (proofDescription?: string) => void
  isSubmitting: boolean
}

export function TaskSubmitModal({
  isOpen,
  task,
  userId,
  onClose,
  onSubmit,
  isSubmitting,
}: TaskSubmitModalProps) {
  const { showToast } = useToast()
  const [proofDescription, setProofDescription] = useState('')
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])

  // Deliverable state
  const [summary, setSummary] = useState('')
  const [links, setLinks] = useState<DeliverableLink[]>([])
  const [nextSteps, setNextSteps] = useState('')
  const [newLinkUrl, setNewLinkUrl] = useState('')
  const [newLinkTitle, setNewLinkTitle] = useState('')

  // Fetch existing deliverable if task has one
  const { data: deliverableData } = trpc.task.getDeliverable.useQuery(
    { taskId: task?.id },
    { enabled: !!task?.id && isOpen }
  )

  // Populate form with existing deliverable data
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

  const uploadMutation = trpc.file.upload.useMutation({
    onSuccess: (data) => {
      setUploadedFiles(prev => [...prev, data.file as UploadedFile])
      showToast('File uploaded!', 'success')
    },
    onError: (error) => {
      showToast(error.message, 'error')
    }
  })

  const deleteMutation = trpc.file.delete.useMutation({
    onSuccess: (_, variables) => {
      setUploadedFiles(prev => prev.filter(f => f.id !== variables.fileId))
      showToast('File deleted', 'success')
    },
    onError: (error) => {
      showToast(error.message, 'error')
    }
  })

  // @ts-ignore - tRPC type instantiation depth issue
  const updateDeliverableMutation = trpc.task.updateDeliverable.useMutation({
    onError: (error) => {
      showToast(error.message, 'error')
    }
  })

  const attachFileMutation = trpc.task.attachFileToDeliverable.useMutation({
    onError: (error) => {
      showToast(error.message, 'error')
    }
  })

  const handleUpload = (file: { fileName: string; mimeType: string; base64Data: string }) => {
    if (!userId || !task) return

    uploadMutation.mutate({
      fileName: file.fileName,
      mimeType: file.mimeType,
      base64Data: file.base64Data,
      userId,
      taskId: task.id,
      category: 'DOCUMENT',
    })
  }

  const handleDelete = (fileId: string) => {
    if (!userId) return
    deleteMutation.mutate({ fileId, userId })
  }

  const handleAddLink = () => {
    if (!newLinkUrl.trim() || !newLinkTitle.trim()) {
      showToast('Please enter both URL and title', 'error')
      return
    }

    // Basic URL validation
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

  const handleClose = () => {
    setProofDescription('')
    setUploadedFiles([])
    setSummary('')
    setLinks([])
    setNextSteps('')
    setNewLinkUrl('')
    setNewLinkTitle('')
    onClose()
  }

  const handleSubmit = async () => {
    // Check if deliverable is required and summary meets minimum
    if (task?.requiresDeliverable) {
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
      // Save deliverable first if task requires it or if summary is provided
      if (summary.trim()) {
        const deliverable = await updateDeliverableMutation.mutateAsync({
          taskId: task.id,
          userId: userId!,
          summary: summary.trim(),
          links: links.length > 0 ? links : undefined,
          nextSteps: nextSteps.trim() || null,
        })

        // Attach any uploaded files to the deliverable
        for (const file of uploadedFiles) {
          await attachFileMutation.mutateAsync({
            deliverableId: deliverable.deliverable.id,
            fileId: file.id,
            userId: userId!,
          })
        }
      }

      // Now submit for verification
      onSubmit(proofDescription || undefined)
      handleClose()
    } catch (error) {
      // Error already shown by mutation onError
    }
  }

  if (!task) return null

  const requiresDeliverable = task.requiresDeliverable ?? true
  const summaryLength = summary.trim().length
  const isSummaryValid = !requiresDeliverable || summaryLength >= 30

  const textareaClassName = "w-full px-4 py-3 border border-gray-300 rounded-lg outline-none transition focus:ring-2 focus:ring-blue-500 focus:border-transparent"
  const inputClassName = "w-full px-4 py-3 border border-gray-300 rounded-lg outline-none transition focus:ring-2 focus:ring-blue-500 focus:border-transparent"

  const isAnyMutationPending = isSubmitting || uploadMutation.isPending || updateDeliverableMutation.isPending || attachFileMutation.isPending

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <Stack spacing="lg">
        <Heading level={2}>Submit for Verification</Heading>

        <Text weight="semibold">{task.name}</Text>

        <Alert variant="info">
          <Text variant="small">
            {requiresDeliverable
              ? 'Please document what was accomplished. This helps capture knowledge for the band.'
              : 'Optionally document what was accomplished. Upload any proof such as receipts or photos.'
            }
          </Text>
        </Alert>

        {/* Deliverable Summary */}
        <Stack spacing="xs">
          <Flex justify="between" align="center">
            <Text variant="small" weight="semibold">
              What was accomplished? {requiresDeliverable && <span className="text-red-500">*</span>}
            </Text>
            <Text variant="small" color="muted">
              {summaryLength}/30 min
            </Text>
          </Flex>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Describe the work completed, decisions made, outcomes achieved..."
            className={`${textareaClassName} ${!isSummaryValid && summaryLength > 0 ? 'border-red-300' : ''}`}
            rows={4}
          />
          {!isSummaryValid && summaryLength > 0 && (
            <Text variant="small" color="muted" className="text-red-500">
              Summary must be at least 30 characters ({30 - summaryLength} more needed)
            </Text>
          )}
        </Stack>

        {/* Links Section */}
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
            <input
              type="url"
              value={newLinkUrl}
              onChange={(e) => setNewLinkUrl(e.target.value)}
              placeholder="https://..."
              className={`${inputClassName} flex-1`}
            />
            <input
              type="text"
              value={newLinkTitle}
              onChange={(e) => setNewLinkTitle(e.target.value)}
              placeholder="Link title"
              className={`${inputClassName} flex-1`}
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
        <Stack spacing="xs">
          <Text variant="small" weight="semibold">Next Steps / Notes for Future (optional)</Text>
          <textarea
            value={nextSteps}
            onChange={(e) => setNextSteps(e.target.value)}
            placeholder="Any follow-up work needed, lessons learned, or notes for whoever picks this up next..."
            className={textareaClassName}
            rows={2}
          />
        </Stack>

        {/* File Upload */}
        <Stack spacing="sm">
          <Text variant="small" weight="semibold">Attach Files (optional)</Text>
          <FileUpload
            onUpload={handleUpload}
            label=""
            description="Upload receipts, photos, or documents (max 5MB)"
            maxSizeMB={5}
            isUploading={uploadMutation.isPending}
            disabled={uploadMutation.isPending}
          />
        </Stack>

        {uploadedFiles.length > 0 && (
          <Stack spacing="sm">
            <Text variant="small" weight="semibold">Uploaded Files ({uploadedFiles.length})</Text>
            <FileList
              files={uploadedFiles}
              onDelete={handleDelete}
              canDelete={true}
              currentUserId={userId}
              isDeleting={deleteMutation.isPending}
              showUploader={false}
            />
          </Stack>
        )}

        {/* Legacy proof description - hidden but kept for backwards compat */}
        <input type="hidden" value={proofDescription} />

        <Flex gap="md" justify="end">
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={isAnyMutationPending}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={isAnyMutationPending || (requiresDeliverable && !isSummaryValid)}
          >
            {isAnyMutationPending ? 'Submitting...' : 'Submit for Review'}
          </Button>
        </Flex>
      </Stack>
    </Modal>
  )
}
