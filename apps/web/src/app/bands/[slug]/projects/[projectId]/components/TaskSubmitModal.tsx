'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { 
  Heading, 
  Text, 
  Stack, 
  Flex, 
  Button, 
  Modal, 
  Alert,
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

  const handleUpload = (file: { fileName: string; mimeType: string; base64Data: string }) => {
    if (!userId || !task) return
    
    uploadMutation.mutate({
      fileName: file.fileName,
      mimeType: file.mimeType,
      base64Data: file.base64Data,
      userId,
      taskId: task.id,
      category: 'RECEIPT',
    })
  }

  const handleDelete = (fileId: string) => {
    if (!userId) return
    deleteMutation.mutate({ fileId, userId })
  }

  const handleClose = () => {
    setProofDescription('')
    setUploadedFiles([])
    onClose()
  }

  const handleSubmit = () => {
    onSubmit(proofDescription || undefined)
    handleClose()
  }

  if (!task) return null

  const textareaClassName = "w-full px-4 py-3 border border-gray-300 rounded-lg outline-none transition focus:ring-2 focus:ring-blue-500 focus:border-transparent"

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <Stack spacing="lg">
        <Heading level={2}>Submit for Verification</Heading>
        
        <Text weight="semibold">{task.name}</Text>
        
        <Alert variant="info">
          <Text variant="small">
            Upload any proof of completion such as receipts, photos, or documents. 
            Add a description of what was done.
          </Text>
        </Alert>

        <Stack spacing="xs">
          <Text variant="small" weight="semibold">What was done? (optional)</Text>
          <textarea
            value={proofDescription}
            onChange={(e) => setProofDescription(e.target.value)}
            placeholder="Describe the work completed, materials purchased, etc..."
            className={textareaClassName}
            rows={3}
          />
        </Stack>

        <Stack spacing="sm">
          <Text variant="small" weight="semibold">Upload Proof</Text>
          <FileUpload
            onUpload={handleUpload}
            label=""
            description="Upload receipts, photos, or documents"
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
        
        <Flex gap="md" justify="end">
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={isSubmitting || uploadMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={isSubmitting || uploadMutation.isPending}
          >
            {isSubmitting ? 'Submitting...' : 'Submit for Review'}
          </Button>
        </Flex>
      </Stack>
    </Modal>
  )
}