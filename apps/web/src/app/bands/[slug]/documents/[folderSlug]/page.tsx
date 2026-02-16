'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { jwtDecode } from 'jwt-decode'
import {
  Text,
  Stack,
  Button,
  Flex,
  Badge,
  Loading,
  Alert,
  BandLayout,
  Modal,
  Input,
  Textarea,
  FileUpload,
  useToast
} from '@/components/ui'
import { AppNav } from '@/components/AppNav'

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileTypeLabel(mimeType: string): string {
  const types: Record<string, string> = {
    'application/pdf': 'PDF',
    'application/msword': 'DOC',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
    'application/vnd.ms-excel': 'XLS',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
    'text/plain': 'TXT',
    'text/csv': 'CSV',
    'image/jpeg': 'JPEG',
    'image/png': 'PNG',
    'image/gif': 'GIF',
    'image/webp': 'WEBP',
  }
  return types[mimeType] || mimeType.split('/')[1]?.toUpperCase() || 'FILE'
}

export default function FolderDetailPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  const folderSlug = params.folderSlug as string
  const { showToast } = useToast()
  const [userId, setUserId] = useState<string | null>(null)

  // Modal states
  const [uploadModal, setUploadModal] = useState(false)
  const [editModal, setEditModal] = useState<{ document: any } | null>(null)
  const [deleteModal, setDeleteModal] = useState<{ document: any } | null>(null)

  // Form states for upload
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadDescription, setUploadDescription] = useState('')
  const [uploadedFile, setUploadedFile] = useState<{ fileId: string; fileName: string; mimeType: string; size: number } | null>(null)
  const [isUploadingFile, setIsUploadingFile] = useState(false)

  // Form states for edit
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')

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

  const { data: bandData, isLoading: bandLoading } = trpc.band.getBySlug.useQuery(
    { slug },
    { enabled: !!slug }
  )

  const { data: folderData, isLoading: folderLoading } = trpc.documents.getFolder.useQuery(
    { bandId: bandData?.band?.id || '', folderSlug, userId: userId || '' },
    { enabled: !!bandData?.band?.id && !!userId && !!folderSlug }
  )

  const { data: documentsData, isLoading: documentsLoading, refetch } = trpc.documents.listDocuments.useQuery(
    { bandId: bandData?.band?.id || '', folderId: folderData?.folder?.id || '', userId: userId || '' },
    { enabled: !!bandData?.band?.id && !!folderData?.folder?.id && !!userId }
  )

  const fileUploadMutation = trpc.file.upload.useMutation()

  const uploadDocumentMutation = trpc.documents.uploadDocument.useMutation({
    onSuccess: () => {
      showToast('Document uploaded!', 'success')
      setUploadModal(false)
      setUploadTitle('')
      setUploadDescription('')
      setUploadedFile(null)
      refetch()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  const updateMutation = trpc.documents.updateDocument.useMutation({
    onSuccess: () => {
      showToast('Document updated!', 'success')
      setEditModal(null)
      refetch()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  const deleteMutation = trpc.documents.deleteDocument.useMutation({
    onSuccess: () => {
      showToast('Document deleted.', 'success')
      setDeleteModal(null)
      refetch()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  const togglePinMutation = trpc.documents.togglePin.useMutation({
    onSuccess: (data) => {
      showToast(data.document.isPinned ? 'Document pinned' : 'Document unpinned', 'success')
      refetch()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  const incrementDownloadMutation = trpc.documents.incrementDownload.useMutation()

  if (bandLoading || folderLoading) {
    return (
      <>
        <AppNav />
        <BandLayout
          bandSlug={slug}
          bandName="Loading..."
          pageTitle="Documents"
          isMember={false}
          wide={true}
          bandId={bandData?.band?.id}
          userId={userId || undefined}
        >
          <Loading message="Loading folder..." />
        </BandLayout>
      </>
    )
  }

  if (!bandData?.band) {
    return (
      <>
        <AppNav />
        <BandLayout
          bandSlug={slug}
          bandName=""
          pageTitle="Documents"
          isMember={false}
          wide={true}
          bandId={bandData?.band?.id}
          userId={userId || undefined}
        >
          <Alert variant="danger">
            <Text>Band not found</Text>
          </Alert>
        </BandLayout>
      </>
    )
  }

  if (!folderData?.folder) {
    return (
      <>
        <AppNav />
        <BandLayout
          bandSlug={slug}
          bandName={bandData.band.name}
          bandImageUrl={bandData.band.imageUrl}
          pageTitle="Documents"
          isMember={false}
          wide={true}
          bandId={bandData?.band?.id}
          userId={userId || undefined}
        >
          <Alert variant="danger">
            <Text>Folder not found</Text>
          </Alert>
        </BandLayout>
      </>
    )
  }

  const band = bandData.band
  const folder = folderData.folder
  const currentMember = band.members.find((m: any) => m.user.id === userId)
  const canApprove = currentMember && band.whoCanApprove.includes(currentMember.role)
  const isMember = !!currentMember
  const canAccessAdminTools = currentMember && ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR'].includes(currentMember.role)
  const canManageDocuments = documentsData?.canManageDocuments || folderData?.canManageDocuments || false

  const documents = documentsData?.documents || []

  const formatDate = (date: string) => {
    const d = new Date(date)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days} days ago`
    return d.toLocaleDateString()
  }

  const handleFileUpload = async (file: { fileName: string; mimeType: string; base64Data: string }) => {
    setIsUploadingFile(true)
    try {
      const result = await fileUploadMutation.mutateAsync({
        fileName: file.fileName,
        mimeType: file.mimeType,
        base64Data: file.base64Data,
        userId: userId!,
        bandId: band.id,
        category: 'DOCUMENT',
      })

      setUploadedFile({
        fileId: result.file.id,
        fileName: file.fileName,
        mimeType: file.mimeType,
        size: result.file.size,
      })

      // Auto-fill title from filename
      const nameWithoutExtension = file.fileName.replace(/\.[^/.]+$/, '')
      if (!uploadTitle) {
        setUploadTitle(nameWithoutExtension)
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to upload file', 'error')
    } finally {
      setIsUploadingFile(false)
    }
  }

  const handleUploadDocument = () => {
    if (!uploadedFile || !uploadTitle.trim()) return
    uploadDocumentMutation.mutate({
      bandId: band.id,
      folderId: folder.id,
      userId: userId!,
      fileId: uploadedFile.fileId,
      title: uploadTitle.trim(),
      description: uploadDescription.trim() || undefined,
    })
  }

  const handleEdit = () => {
    if (!editModal || !editTitle.trim()) return
    updateMutation.mutate({
      documentId: editModal.document.id,
      userId: userId!,
      title: editTitle.trim(),
      description: editDescription.trim() || null,
    })
  }

  const handleDelete = () => {
    if (!deleteModal) return
    deleteMutation.mutate({
      documentId: deleteModal.document.id,
      userId: userId!,
    })
  }

  const handleDownload = async (doc: any) => {
    // Track download
    incrementDownloadMutation.mutate({
      documentId: doc.id,
      userId: userId!,
    })

    // Open file in new tab (triggers download for non-viewable files)
    window.open(doc.file.url, '_blank')
  }

  const handleTogglePin = (doc: any, e: React.MouseEvent) => {
    e.stopPropagation()
    togglePinMutation.mutate({
      documentId: doc.id,
      userId: userId!,
    })
  }

  const openEditModal = (doc: any, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditTitle(doc.title)
    setEditDescription(doc.description || '')
    setEditModal({ document: doc })
  }

  const openDeleteModal = (doc: any, e: React.MouseEvent) => {
    e.stopPropagation()
    setDeleteModal({ document: doc })
  }

  const closeUploadModal = () => {
    setUploadModal(false)
    setUploadTitle('')
    setUploadDescription('')
    setUploadedFile(null)
  }

  return (
    <>
      <AppNav />
      <BandLayout
        bandSlug={slug}
        bandName={band.name}
        bandImageUrl={band.imageUrl}
        pageTitle={folder.name}
        canApprove={canApprove}
        isMember={isMember}
        canAccessAdminTools={canAccessAdminTools}
        wide={true}
        bandId={bandData?.band?.id}
        userId={userId || undefined}
        action={
          canManageDocuments && !folder.isArchived ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setUploadModal(true)}
            >
              Upload Document
            </Button>
          ) : undefined
        }
      >
        <Stack spacing="md">
          <Button variant="ghost" size="sm" onClick={() => router.push(`/bands/${slug}/documents`)}>
            ← Back to Documents
          </Button>

          {folder.description && (
            <Text color="muted">{folder.description}</Text>
          )}

          {folder.isArchived && (
            <Alert variant="warning">
              <Text variant="small">This folder is archived. No new uploads allowed.</Text>
            </Alert>
          )}

          {documentsLoading ? (
            <Loading message="Loading documents..." />
          ) : documents.length === 0 ? (
            <div className="border border-gray-200 rounded-lg bg-white p-8 text-center">
              <Text color="muted" className="mb-4">No documents yet.{canManageDocuments && !folder.isArchived ? ' Upload your first document!' : ''}</Text>
              {canManageDocuments && !folder.isArchived && (
                <Button variant="primary" size="sm" onClick={() => setUploadModal(true)}>
                  Upload Document
                </Button>
              )}
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
              {documents.map((doc: any) => (
                <div
                  key={doc.id}
                  className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between py-3 px-3 md:px-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {doc.isPinned && <Badge variant="info">Pinned</Badge>}
                        <Text weight="semibold">{doc.title}</Text>
                        <Badge variant="neutral">{getFileTypeLabel(doc.file.mimeType)}</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                        <span>Uploaded by {doc.uploadedBy.name}</span>
                        <span>•</span>
                        <span>{formatDate(doc.createdAt)}</span>
                        <span>•</span>
                        <span>{formatFileSize(doc.file.size)}</span>
                        {doc.downloadCount > 0 && (
                          <>
                            <span>•</span>
                            <span>{doc.downloadCount} download{doc.downloadCount !== 1 ? 's' : ''}</span>
                          </>
                        )}
                      </div>
                      {doc.description && (
                        <Text variant="small" color="muted" className="line-clamp-1 mt-1">{doc.description}</Text>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <Button variant="secondary" size="sm" onClick={() => handleDownload(doc)}>
                        Download
                      </Button>
                      {canManageDocuments && (
                        <Flex gap="xs">
                          <Button variant="ghost" size="sm" onClick={(e) => handleTogglePin(doc, e)}>
                            {doc.isPinned ? 'Unpin' : 'Pin'}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={(e) => openEditModal(doc, e)}>
                            Edit
                          </Button>
                          <Button variant="ghost" size="sm" onClick={(e) => openDeleteModal(doc, e)}>
                            Delete
                          </Button>
                        </Flex>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Stack>

        {/* Upload Document Modal */}
        <Modal isOpen={uploadModal} onClose={closeUploadModal}>
          <Stack spacing="md">
            <Text weight="semibold" className="text-lg">Upload Document</Text>

            {!uploadedFile ? (
              <FileUpload
                label="Select File"
                description="PDF, Word, Excel, or text files up to 10MB"
                onUpload={handleFileUpload}
                isUploading={isUploadingFile}
                accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,text/csv"
              />
            ) : (
              <div className="border border-green-200 bg-green-50 rounded-lg p-3">
                <Flex justify="between" align="center">
                  <div>
                    <Text weight="semibold">{uploadedFile.fileName}</Text>
                    <Text variant="small" color="muted">
                      {getFileTypeLabel(uploadedFile.mimeType)} • {formatFileSize(uploadedFile.size)}
                    </Text>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setUploadedFile(null)}>
                    Change
                  </Button>
                </Flex>
              </div>
            )}

            <Input
              label="Title"
              placeholder="Document title"
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
              maxLength={200}
            />
            <Textarea
              label="Description"
              placeholder="Brief description (optional)"
              value={uploadDescription}
              onChange={(e) => setUploadDescription(e.target.value)}
              rows={2}
            />

            <Flex justify="end" gap="sm">
              <Button variant="ghost" size="sm" onClick={closeUploadModal}>Cancel</Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleUploadDocument}
                disabled={!uploadedFile || !uploadTitle.trim() || uploadDocumentMutation.isPending}
              >
                {uploadDocumentMutation.isPending ? 'Uploading...' : 'Upload'}
              </Button>
            </Flex>
          </Stack>
        </Modal>

        {/* Edit Document Modal */}
        <Modal isOpen={!!editModal} onClose={() => setEditModal(null)}>
          <Stack spacing="md">
            <Text weight="semibold" className="text-lg">Edit Document</Text>
            <Input
              label="Title"
              placeholder="Document title"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              maxLength={200}
            />
            <Textarea
              label="Description"
              placeholder="Brief description (optional)"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={2}
            />
            <Flex justify="end" gap="sm">
              <Button variant="ghost" size="sm" onClick={() => setEditModal(null)}>Cancel</Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleEdit}
                disabled={!editTitle.trim() || updateMutation.isPending}
              >
                {updateMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </Flex>
          </Stack>
        </Modal>

        {/* Delete Document Modal */}
        <Modal isOpen={!!deleteModal} onClose={() => setDeleteModal(null)}>
          <Stack spacing="md">
            <Text weight="semibold" className="text-lg">Delete Document</Text>
            <Text variant="small">Delete "{deleteModal?.document.title}"? This cannot be undone.</Text>
            <Flex justify="end" gap="sm">
              <Button variant="ghost" size="sm" onClick={() => setDeleteModal(null)}>Cancel</Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </Flex>
          </Stack>
        </Modal>
      </BandLayout>
    </>
  )
}
