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
  Flex,
  Card,
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

export default function PostsPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  const { showToast } = useToast()
  const [userId, setUserId] = useState<string | null>(null)

  // Modal states
  const [createModal, setCreateModal] = useState(false)
  const [editModal, setEditModal] = useState<{ category: any } | null>(null)
  const [deleteModal, setDeleteModal] = useState<{ category: any } | null>(null)

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

  const { data: categoriesData, isLoading: categoriesLoading, refetch } = trpc.posts.listCategories.useQuery(
    { bandId: bandData?.band?.id || '', userId: userId || '' },
    { enabled: !!bandData?.band?.id && !!userId }
  )

  const createMutation = trpc.posts.createCategory.useMutation({
    onSuccess: () => {
      showToast('Category created!', 'success')
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

  const updateMutation = trpc.posts.updateCategory.useMutation({
    onSuccess: () => {
      showToast('Category updated!', 'success')
      setEditModal(null)
      refetch()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  const deleteMutation = trpc.posts.deleteCategory.useMutation({
    onSuccess: () => {
      showToast('Category deleted.', 'success')
      setDeleteModal(null)
      refetch()
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  if (bandLoading || categoriesLoading) {
    return (
      <>
        <AppNav />
        <BandLayout
          bandSlug={slug}
          bandName="Loading..."
          pageTitle="Posts"
          isMember={false}
          wide={true}
          bandId={bandData?.band?.id}
          userId={userId || undefined}
        >
          <Loading message="Loading posts..." />
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
          pageTitle="Posts"
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
  const canManageCategories = categoriesData?.canCreateCategory || false

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
    if (!date) return 'No posts yet'
    return new Date(date).toLocaleDateString()
  }

  const categories = categoriesData?.categories || []

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
      categoryId: editModal.category.id,
      userId: userId!,
      name: editName.trim(),
      description: editDescription.trim() || null,
      visibility: editVisibility,
    })
  }

  const handleDelete = () => {
    if (!deleteModal) return
    deleteMutation.mutate({
      categoryId: deleteModal.category.id,
      userId: userId!,
    })
  }

  const openEditModal = (category: any, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditName(category.name)
    setEditDescription(category.description || '')
    setEditVisibility(category.visibility)
    setEditModal({ category })
  }

  const openDeleteModal = (category: any, e: React.MouseEvent) => {
    e.stopPropagation()
    setDeleteModal({ category })
  }

  return (
    <>
      <AppNav />
      <BandLayout
        bandSlug={slug}
        bandName={band.name}
        bandImageUrl={band.imageUrl}
        pageTitle="Posts"
        canApprove={canApprove}
        isMember={isMember}
        canAccessAdminTools={canAccessAdminTools}
        wide={true}
        bandId={bandData?.band?.id}
        userId={userId || undefined}
        action={
          canManageCategories ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCreateModal(true)}
            >
              New Category
            </Button>
          ) : undefined
        }
      >
        <Stack spacing="xl">
          <Stack spacing="sm">
            <Text color="muted">
              Long-form discussions and conversations for your band.
            </Text>
          </Stack>

          {categories.length === 0 ? (
            <Alert variant="info">
              <Text>No post categories yet. Check back later!</Text>
            </Alert>
          ) : (
            <Stack spacing="md">
              {categories.map((category: any) => (
                <Card
                  key={category.id}
                  style={{
                    cursor: category.hasAccess ? 'pointer' : 'default',
                    opacity: category.hasAccess ? 1 : 0.6,
                  }}
                  onClick={() => {
                    if (category.hasAccess) {
                      router.push(`/bands/${slug}/posts/${category.slug}`)
                    }
                  }}
                >
                  <Flex justify="between" align="center">
                    <Stack spacing="xs">
                      <Flex align="center" gap="sm">
                        <Heading level={3}>{category.name}</Heading>
                        {getVisibilityBadge(category.visibility)}
                        {category.isArchived && <Badge variant="neutral">Archived</Badge>}
                      </Flex>
                      {category.description && (
                        <Text variant="small" color="muted">
                          {category.description}
                        </Text>
                      )}
                      {!category.hasAccess && (
                        <Text variant="small" color="danger">
                          Access restricted
                        </Text>
                      )}
                    </Stack>
                    <Flex align="center" gap="md">
                      {category.hasAccess && (
                        <div style={{ textAlign: 'right' }}>
                          <Stack spacing="xs">
                            <Text variant="small" weight="semibold">
                              {category.postCount} {category.postCount === 1 ? 'post' : 'posts'}
                            </Text>
                            <Text variant="small" color="muted">
                              Last activity: {formatDate(category.lastPostAt)}
                            </Text>
                          </Stack>
                        </div>
                      )}
                      {canManageCategories && (
                        <Flex gap="xs">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => openEditModal(category, e)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => openDeleteModal(category, e)}
                            disabled={category.postCount > 0}
                          >
                            Delete
                          </Button>
                        </Flex>
                      )}
                    </Flex>
                  </Flex>
                </Card>
              ))}
            </Stack>
          )}
        </Stack>

        {/* Create Category Modal */}
        <Modal
          isOpen={createModal}
          onClose={() => setCreateModal(false)}
          title="Create New Category"
        >
          <Stack spacing="md">
            <Stack spacing="xs">
              <Text weight="semibold">Name</Text>
              <Input
                placeholder="Category name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                maxLength={80}
              />
            </Stack>

            <Stack spacing="xs">
              <Text weight="semibold">Description (optional)</Text>
              <Textarea
                placeholder="Brief description of this category"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={2}
              />
            </Stack>

            <Stack spacing="xs">
              <Text weight="semibold">Visibility</Text>
              <Select
                value={newVisibility}
                onChange={(e) => setNewVisibility(e.target.value as any)}
              >
                <option value="PUBLIC">Public - All members</option>
                <option value="MODERATOR">Moderators+ only</option>
                <option value="GOVERNANCE">Governors+ only</option>
              </Select>
            </Stack>

            <Flex justify="end" gap="sm">
              <Button variant="ghost" onClick={() => setCreateModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleCreate}
                disabled={!newName.trim() || createMutation.isPending}
              >
                {createMutation.isPending ? 'Creating...' : 'Create'}
              </Button>
            </Flex>
          </Stack>
        </Modal>

        {/* Edit Category Modal */}
        <Modal
          isOpen={!!editModal}
          onClose={() => setEditModal(null)}
          title="Edit Category"
        >
          <Stack spacing="md">
            <Stack spacing="xs">
              <Text weight="semibold">Name</Text>
              <Input
                placeholder="Category name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={80}
              />
            </Stack>

            <Stack spacing="xs">
              <Text weight="semibold">Description (optional)</Text>
              <Textarea
                placeholder="Brief description of this category"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={2}
              />
            </Stack>

            <Stack spacing="xs">
              <Text weight="semibold">Visibility</Text>
              <Select
                value={editVisibility}
                onChange={(e) => setEditVisibility(e.target.value as any)}
              >
                <option value="PUBLIC">Public - All members</option>
                <option value="MODERATOR">Moderators+ only</option>
                <option value="GOVERNANCE">Governors+ only</option>
              </Select>
            </Stack>

            <Flex justify="end" gap="sm">
              <Button variant="ghost" onClick={() => setEditModal(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleEdit}
                disabled={!editName.trim() || updateMutation.isPending}
              >
                {updateMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </Flex>
          </Stack>
        </Modal>

        {/* Delete Category Modal */}
        <Modal
          isOpen={!!deleteModal}
          onClose={() => setDeleteModal(null)}
          title="Delete Category"
        >
          <Stack spacing="md">
            {deleteModal && deleteModal.category.postCount > 0 ? (
              <Alert variant="warning">
                <Text>
                  Cannot delete "{deleteModal.category.name}" because it contains {deleteModal.category.postCount} post(s).
                  Please delete all posts first.
                </Text>
              </Alert>
            ) : (
              <Text>
                Are you sure you want to delete the category "{deleteModal?.category.name}"?
                This action cannot be undone.
              </Text>
            )}

            <Flex justify="end" gap="sm">
              <Button variant="ghost" onClick={() => setDeleteModal(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDelete}
                disabled={deleteMutation.isPending || (deleteModal?.category.postCount > 0)}
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
