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
  Select,
  useToast
} from '@/components/ui'
import { AppNav } from '@/components/AppNav'

export default function DocumentsPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  const { showToast } = useToast()
  const [userId, setUserId] = useState<string | null>(null)

  // Modal states
  const [createModal, setCreateModal] = useState(false)
  const [editModal, setEditModal] = useState<{ folder: any } | null>(null)
  const [deleteModal, setDeleteModal] = useState<{ folder: any } | null>(null)

  // Form states for create
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newVisibility, setNewVisibility] = useState<'PUBLIC' | 'MODERATOR' | 'GOVERNANCE'>('PUBLIC')

  // Form states for edit
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editVisibility, setEditVisibility] = useState<'PUBLIC' | 'MODERATOR' | 'GOVERNANCE'>('PUBLIC')

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

  const { data: foldersData, isLoading: foldersLoading, refetch } = trpc.documents.listFolders.useQuery(
    { bandId: bandData?.band?.id || '', userId: userId || '' },
    { enabled: !!bandData?.band?.id && !!userId }
  )

  const createMutation = trpc.documents.createFolder.useMutation({
    onSuccess: () => {
      showToast('Folder created!', 'success')
      setCreateModal(false)
      setNewName('')
      setNewDescription('')
      setNewVisibility('PUBLIC')
      refetch()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  const updateMutation = trpc.documents.updateFolder.useMutation({
    onSuccess: () => {
      showToast('Folder updated!', 'success')
      setEditModal(null)
      refetch()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  const deleteMutation = trpc.documents.deleteFolder.useMutation({
    onSuccess: () => {
      showToast('Folder deleted.', 'success')
      setDeleteModal(null)
      refetch()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  if (bandLoading || foldersLoading) {
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
          <Loading message="Loading documents..." />
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

  const band = bandData.band
  const currentMember = band.members.find((m: any) => m.user.id === userId)
  const canApprove = currentMember && band.whoCanApprove.includes(currentMember.role)
  const isMember = !!currentMember
  const canAccessAdminTools = currentMember && ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR'].includes(currentMember.role)
  const canManageDocuments = foldersData?.canManageDocuments || false

  const getVisibilityBadge = (visibility: string) => {
    switch (visibility) {
      case 'GOVERNANCE':
        return <Badge variant="warning">Governors Only</Badge>
      case 'MODERATOR':
        return <Badge variant="info">Moderators+</Badge>
      default:
        return null
    }
  }

  const formatDate = (date: string | null) => {
    if (!date) return 'No documents yet'
    return new Date(date).toLocaleDateString()
  }

  const folders = foldersData?.folders || []

  const handleCreate = () => {
    if (!newName.trim()) return
    createMutation.mutate({
      bandId: band.id,
      userId: userId!,
      name: newName.trim(),
      description: newDescription.trim() || undefined,
      visibility: newVisibility,
    })
  }

  const handleEdit = () => {
    if (!editModal || !editName.trim()) return
    updateMutation.mutate({
      folderId: editModal.folder.id,
      userId: userId!,
      name: editName.trim(),
      description: editDescription.trim() || null,
      visibility: editVisibility,
    })
  }

  const handleDelete = () => {
    if (!deleteModal) return
    deleteMutation.mutate({
      folderId: deleteModal.folder.id,
      userId: userId!,
    })
  }

  const openEditModal = (folder: any, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditName(folder.name)
    setEditDescription(folder.description || '')
    setEditVisibility(folder.visibility)
    setEditModal({ folder })
  }

  const openDeleteModal = (folder: any, e: React.MouseEvent) => {
    e.stopPropagation()
    setDeleteModal({ folder })
  }

  return (
    <>
      <AppNav />
      <BandLayout
        bandSlug={slug}
        bandName={band.name}
        bandImageUrl={band.imageUrl}
        pageTitle="Documents"
        canApprove={canApprove}
        isMember={isMember}
        canAccessAdminTools={canAccessAdminTools}
        wide={true}
        bandId={bandData?.band?.id}
        userId={userId || undefined}
        action={
          canManageDocuments ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCreateModal(true)}
            >
              New Folder
            </Button>
          ) : undefined
        }
      >
        <Stack spacing="md">
          {folders.length === 0 ? (
            <div className="border border-gray-200 rounded-lg bg-white p-8 text-center">
              <Text color="muted" className="mb-4">No folders yet. {canManageDocuments ? 'Create your first folder to organize your band\'s documents.' : ''}</Text>
              {canManageDocuments && (
                <Button variant="primary" size="sm" onClick={() => setCreateModal(true)}>
                  Create Folder
                </Button>
              )}
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
              {folders.map((folder: any) => (
                <div
                  key={folder.id}
                  className={`border-b border-gray-100 last:border-b-0 ${folder.hasAccess ? 'hover:bg-gray-50 cursor-pointer' : 'opacity-60'}`}
                  onClick={() => {
                    if (folder.hasAccess) {
                      router.push(`/bands/${slug}/documents/${folder.slug}`)
                    }
                  }}
                >
                  <div className="flex items-center justify-between py-3 px-3 md:px-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-lg">📁</span>
                        <Text weight="semibold">{folder.name}</Text>
                        {getVisibilityBadge(folder.visibility)}
                        {folder.isArchived && <Badge variant="neutral">Archived</Badge>}
                        {!folder.hasAccess && <Badge variant="danger">Restricted</Badge>}
                      </div>
                      {folder.description && (
                        <Text variant="small" color="muted" className="line-clamp-1 ml-7">{folder.description}</Text>
                      )}
                    </div>
                    <div className="flex items-center gap-3 ml-3">
                      {folder.hasAccess && (
                        <div className="text-right text-sm">
                          <span className="font-medium">{folder.documentCount}</span>
                          <span className="text-gray-500 ml-1">{folder.documentCount === 1 ? 'doc' : 'docs'}</span>
                        </div>
                      )}
                      {canManageDocuments && (
                        <Flex gap="xs">
                          <Button variant="ghost" size="sm" onClick={(e) => openEditModal(folder, e)}>Edit</Button>
                          <Button variant="ghost" size="sm" onClick={(e) => openDeleteModal(folder, e)} disabled={folder.documentCount > 0}>Delete</Button>
                        </Flex>
                      )}
                      {folder.hasAccess && <span className="text-gray-400">→</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Stack>

        {/* Create Folder Modal */}
        <Modal isOpen={createModal} onClose={() => setCreateModal(false)}>
          <Stack spacing="md">
            <Text weight="semibold" className="text-lg">New Folder</Text>
            <Input label="Name" placeholder="Folder name" value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={100} />
            <Textarea label="Description" placeholder="Brief description (optional)" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} rows={2} />
            <div>
              <Text variant="small" weight="semibold" className="mb-1">Visibility</Text>
              <Select value={newVisibility} onChange={(e) => setNewVisibility(e.target.value as any)}>
                <option value="PUBLIC">All members</option>
                <option value="MODERATOR">Moderators+</option>
                <option value="GOVERNANCE">Governors+</option>
              </Select>
            </div>
            <Flex justify="end" gap="sm">
              <Button variant="ghost" size="sm" onClick={() => setCreateModal(false)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handleCreate} disabled={!newName.trim() || createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create'}
              </Button>
            </Flex>
          </Stack>
        </Modal>

        {/* Edit Folder Modal */}
        <Modal isOpen={!!editModal} onClose={() => setEditModal(null)}>
          <Stack spacing="md">
            <Text weight="semibold" className="text-lg">Edit Folder</Text>
            <Input label="Name" placeholder="Folder name" value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={100} />
            <Textarea label="Description" placeholder="Brief description (optional)" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={2} />
            <div>
              <Text variant="small" weight="semibold" className="mb-1">Visibility</Text>
              <Select value={editVisibility} onChange={(e) => setEditVisibility(e.target.value as any)}>
                <option value="PUBLIC">All members</option>
                <option value="MODERATOR">Moderators+</option>
                <option value="GOVERNANCE">Governors+</option>
              </Select>
            </div>
            <Flex justify="end" gap="sm">
              <Button variant="ghost" size="sm" onClick={() => setEditModal(null)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handleEdit} disabled={!editName.trim() || updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </Flex>
          </Stack>
        </Modal>

        {/* Delete Folder Modal */}
        <Modal isOpen={!!deleteModal} onClose={() => setDeleteModal(null)}>
          <Stack spacing="md">
            <Text weight="semibold" className="text-lg">Delete Folder</Text>
            {deleteModal && deleteModal.folder.documentCount > 0 ? (
              <Alert variant="warning">
                <Text variant="small">Cannot delete - contains {deleteModal.folder.documentCount} document(s).</Text>
              </Alert>
            ) : (
              <Text variant="small">Delete "{deleteModal?.folder.name}"? This cannot be undone.</Text>
            )}
            <Flex justify="end" gap="sm">
              <Button variant="ghost" size="sm" onClick={() => setDeleteModal(null)}>Cancel</Button>
              <Button variant="danger" size="sm" onClick={handleDelete} disabled={deleteMutation.isPending || (deleteModal?.folder.documentCount > 0)}>
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </Flex>
          </Stack>
        </Modal>
      </BandLayout>
    </>
  )
}
