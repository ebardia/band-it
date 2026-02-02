'use client'

import { useState, useEffect } from 'react'
import { jwtDecode } from 'jwt-decode'
import { Modal } from '@/components/ui/Modal'
import { FileUpload } from '@/components/ui/FileUpload'
import { useToast, Button, Text, Stack } from '@/components/ui'
import { trpc } from '@/lib/trpc'

type FeedbackCategory = 'BUG' | 'FEATURE' | 'COMMENT'

interface FeedbackModalProps {
  isOpen: boolean
  onClose: () => void
}

interface UploadedFile {
  id: string
  filename: string
  originalName: string
  url: string
}

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const { showToast } = useToast()
  const [userId, setUserId] = useState<string | null>(null)
  const [category, setCategory] = useState<FeedbackCategory>('FEATURE')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      try {
        const decoded: any = jwtDecode(token)
        setUserId(decoded.userId)
      } catch (error) {
        console.error('Invalid token:', error)
      }
    }
  }, [])

  const uploadFileMutation = trpc.file.upload.useMutation()
  const submitFeedbackMutation = trpc.feedback.submit.useMutation()

  const handleFileUpload = async (fileData: { fileName: string; mimeType: string; base64Data: string }) => {
    if (!userId) return

    setIsUploading(true)
    try {
      const result = await uploadFileMutation.mutateAsync({
        ...fileData,
        userId,
      })

      setUploadedFiles(prev => [...prev, {
        id: result.file.id,
        filename: result.file.filename,
        originalName: result.file.originalName,
        url: result.file.url,
      }])
      showToast('File uploaded', 'success')
    } catch (error: any) {
      showToast(error.message || 'Failed to upload file', 'error')
    } finally {
      setIsUploading(false)
    }
  }

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!userId) {
      showToast('Please log in to submit feedback', 'error')
      return
    }

    if (title.length < 5) {
      showToast('Title must be at least 5 characters', 'error')
      return
    }

    if (description.length < 10) {
      showToast('Description must be at least 10 characters', 'error')
      return
    }

    try {
      await submitFeedbackMutation.mutateAsync({
        category,
        title,
        description,
        userId,
        attachmentIds: uploadedFiles.map(f => f.id),
      })

      showToast('Feedback submitted successfully! Thank you.', 'success')

      // Reset form
      setCategory('FEATURE')
      setTitle('')
      setDescription('')
      setUploadedFiles([])
      onClose()
    } catch (error: any) {
      showToast(error.message || 'Failed to submit feedback', 'error')
    }
  }

  const categoryOptions: { value: FeedbackCategory; label: string; emoji: string; description: string }[] = [
    { value: 'BUG', label: 'Bug Report', emoji: '', description: 'Something is broken or not working' },
    { value: 'FEATURE', label: 'Feature Request', emoji: '', description: 'Suggest a new feature or improvement' },
    { value: 'COMMENT', label: 'General Comment', emoji: '', description: 'Share thoughts or feedback' },
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" title="Send Feedback">
      <form onSubmit={handleSubmit}>
        <Stack spacing="md">
          {/* Category Selection */}
          <div>
            <Text variant="small" weight="semibold" className="mb-2 block">Category</Text>
            <div className="grid grid-cols-3 gap-2">
              {categoryOptions.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setCategory(opt.value)}
                  className={`p-3 rounded-lg border-2 text-left transition-colors ${
                    category === opt.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-lg mb-1">{opt.emoji}</div>
                  <Text variant="small" weight="semibold">{opt.label}</Text>
                  <Text variant="tiny" className="text-gray-500 mt-0.5">{opt.description}</Text>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block">
              <Text variant="small" weight="semibold" className="mb-1 block">Title</Text>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Brief summary of your feedback"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={200}
                required
              />
              <Text variant="tiny" className="text-gray-400 mt-1">{title.length}/200</Text>
            </label>
          </div>

          {/* Description */}
          <div>
            <label className="block">
              <Text variant="small" weight="semibold" className="mb-1 block">Description</Text>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your feedback in detail. For bugs, include steps to reproduce."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                rows={5}
                maxLength={5000}
                required
              />
              <Text variant="tiny" className="text-gray-400 mt-1">{description.length}/5000</Text>
            </label>
          </div>

          {/* File Attachments */}
          <div>
            <Text variant="small" weight="semibold" className="mb-2 block">
              Attachments (optional, max 5)
            </Text>

            {uploadedFiles.length < 5 && (
              <FileUpload
                onUpload={handleFileUpload}
                isUploading={isUploading}
                label=""
                description="Screenshots, logs, or relevant files"
                maxSizeMB={10}
              />
            )}

            {/* Uploaded files list */}
            {uploadedFiles.length > 0 && (
              <div className="mt-3 space-y-2">
                {uploadedFiles.map(file => (
                  <div key={file.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <Text variant="small" className="truncate flex-1">{file.originalName}</Text>
                    <button
                      type="button"
                      onClick={() => removeFile(file.id)}
                      className="ml-2 text-red-500 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={submitFeedbackMutation.isPending || !title || !description}
            >
              {submitFeedbackMutation.isPending ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </div>
        </Stack>
      </form>
    </Modal>
  )
}
