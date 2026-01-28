'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { jwtDecode } from 'jwt-decode'
import {
  Text,
  Stack,
  Card,
  Loading,
  Alert,
  AdminLayout,
  Flex,
  Badge,
  Button,
  Input,
  Modal,
  Select,
  Textarea
} from '@/components/ui'
import { AppNav } from '@/components/AppNav'

const CATEGORY_OPTIONS = [
  'GETTING_STARTED',
  'BANDS',
  'PROPOSALS',
  'DISCUSSIONS',
  'BILLING',
  'ACCOUNT',
]

const CATEGORY_LABELS: Record<string, string> = {
  GETTING_STARTED: 'Getting Started',
  BANDS: 'Bands',
  PROPOSALS: 'Proposals',
  DISCUSSIONS: 'Discussions',
  BILLING: 'Billing',
  ACCOUNT: 'Account',
}

export default function AdminFaqPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const utils = trpc.useUtils()

  // Modal states
  const [addModal, setAddModal] = useState(false)
  const [editModal, setEditModal] = useState<{ open: boolean; entry: any }>({ open: false, entry: null })

  // Form states - Add
  const [newCategory, setNewCategory] = useState('GETTING_STARTED')
  const [newQuestion, setNewQuestion] = useState('')
  const [newAnswer, setNewAnswer] = useState('')
  const [newKeywords, setNewKeywords] = useState('')
  const [newRelatedPages, setNewRelatedPages] = useState('')
  const [newSortOrder, setNewSortOrder] = useState(1)
  const [newIsPublished, setNewIsPublished] = useState(true)

  // Form states - Edit
  const [editCategory, setEditCategory] = useState('')
  const [editQuestion, setEditQuestion] = useState('')
  const [editAnswer, setEditAnswer] = useState('')
  const [editKeywords, setEditKeywords] = useState('')
  const [editRelatedPages, setEditRelatedPages] = useState('')
  const [editSortOrder, setEditSortOrder] = useState(1)
  const [editIsPublished, setEditIsPublished] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      try {
        const decoded: any = jwtDecode(token)
        setUserId(decoded.userId)
      } catch (error) {
        router.push('/login')
      }
    } else {
      router.push('/login')
    }
  }, [router])

  const { data: profileData, isLoading: profileLoading } = trpc.auth.getProfile.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  )

  const { data: faqData, isLoading: faqLoading } = trpc.admin.getFaqEntries.useQuery(
    {
      adminUserId: userId!,
      search: search || undefined,
      category: filterCategory || undefined,
    },
    { enabled: !!userId && profileData?.user?.isAdmin }
  )

  const createMutation = trpc.admin.createFaqEntry.useMutation({
    onSuccess: () => {
      utils.admin.getFaqEntries.invalidate()
      setAddModal(false)
      resetAddForm()
    },
  })

  const updateMutation = trpc.admin.updateFaqEntry.useMutation({
    onSuccess: () => {
      utils.admin.getFaqEntries.invalidate()
      setEditModal({ open: false, entry: null })
    },
  })

  const deleteMutation = trpc.admin.deleteFaqEntry.useMutation({
    onSuccess: () => {
      utils.admin.getFaqEntries.invalidate()
    },
  })

  const resetAddForm = () => {
    setNewCategory('GETTING_STARTED')
    setNewQuestion('')
    setNewAnswer('')
    setNewKeywords('')
    setNewRelatedPages('')
    setNewSortOrder(1)
    setNewIsPublished(true)
  }

  const openEditModal = (entry: any) => {
    setEditCategory(entry.category)
    setEditQuestion(entry.question)
    setEditAnswer(entry.answer)
    setEditKeywords(entry.keywords?.join(', ') || '')
    setEditRelatedPages(entry.relatedPages?.join(', ') || '')
    setEditSortOrder(entry.sortOrder)
    setEditIsPublished(entry.isPublished)
    setEditModal({ open: true, entry })
  }

  if (profileLoading) {
    return (
      <>
        <AppNav />
        <AdminLayout pageTitle="FAQ Management" subtitle="Loading...">
          <Loading message="Checking permissions..." />
        </AdminLayout>
      </>
    )
  }

  if (!profileData?.user?.isAdmin) {
    return (
      <>
        <AppNav />
        <AdminLayout pageTitle="Access Denied">
          <Alert variant="danger">
            <Text>You do not have permission to access the admin area.</Text>
          </Alert>
        </AdminLayout>
      </>
    )
  }

  const parseList = (str: string): string[] =>
    str.split(',').map(s => s.trim()).filter(s => s.length > 0)

  const handleCreate = () => {
    if (!newQuestion.trim() || !newAnswer.trim()) return
    createMutation.mutate({
      adminUserId: userId!,
      category: newCategory,
      question: newQuestion.trim(),
      answer: newAnswer.trim(),
      keywords: parseList(newKeywords),
      relatedPages: parseList(newRelatedPages),
      sortOrder: newSortOrder,
      isPublished: newIsPublished,
    })
  }

  const handleUpdate = () => {
    if (!editModal.entry || !editQuestion.trim() || !editAnswer.trim()) return
    updateMutation.mutate({
      adminUserId: userId!,
      entryId: editModal.entry.id,
      category: editCategory,
      question: editQuestion.trim(),
      answer: editAnswer.trim(),
      keywords: parseList(editKeywords),
      relatedPages: parseList(editRelatedPages),
      sortOrder: editSortOrder,
      isPublished: editIsPublished,
    })
  }

  const handleDelete = (entryId: string) => {
    if (confirm('Are you sure you want to delete this FAQ entry?')) {
      deleteMutation.mutate({
        adminUserId: userId!,
        entryId,
      })
    }
  }

  const handleTogglePublished = (entry: any) => {
    updateMutation.mutate({
      adminUserId: userId!,
      entryId: entry.id,
      isPublished: !entry.isPublished,
    })
  }

  // Group entries by category for display
  const groupedEntries: Record<string, any[]> = {}
  if (faqData?.entries) {
    for (const entry of faqData.entries) {
      if (!groupedEntries[entry.category]) {
        groupedEntries[entry.category] = []
      }
      groupedEntries[entry.category].push(entry)
    }
  }

  return (
    <>
      <AppNav />
      <AdminLayout pageTitle="FAQ Management" subtitle="Manage help center FAQ entries">
        <Stack spacing="lg">
          {/* Actions Bar */}
          <Flex gap="md" justify="between" wrap="wrap">
            <Flex gap="sm" wrap="wrap">
              <Input
                placeholder="Search questions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-56"
              />
              <Select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-44"
              >
                <option value="">All Categories</option>
                {(faqData?.categories || CATEGORY_OPTIONS).map(cat => (
                  <option key={cat} value={cat}>{CATEGORY_LABELS[cat] || cat}</option>
                ))}
              </Select>
            </Flex>
            <Button variant="primary" size="sm" onClick={() => setAddModal(true)}>
              Add FAQ Entry
            </Button>
          </Flex>

          {/* Stats */}
          {faqData?.entries && (
            <Text variant="small" color="muted">
              {faqData.entries.length} entries across {Object.keys(groupedEntries).length} categories
              {' '} ({faqData.entries.filter((e: any) => e.isPublished).length} published)
            </Text>
          )}

          {/* FAQ List by Category */}
          {faqLoading ? (
            <Loading message="Loading FAQ entries..." />
          ) : Object.keys(groupedEntries).length > 0 ? (
            <Stack spacing="lg">
              {Object.entries(groupedEntries).map(([category, entries]) => (
                <div key={category}>
                  <Text weight="semibold" className="text-gray-700 mb-2">
                    {CATEGORY_LABELS[category] || category}
                  </Text>
                  <Card>
                    <div className="divide-y divide-gray-100">
                      {entries.map((entry: any) => (
                        <div key={entry.id} className="py-3 px-1">
                          <Flex justify="between" align="start">
                            <Stack spacing="xs" className="flex-1 mr-4">
                              <Flex gap="sm" align="center" className="flex-wrap">
                                <Text weight="semibold" className={!entry.isPublished ? 'text-gray-400' : ''}>
                                  {entry.question}
                                </Text>
                                {!entry.isPublished && (
                                  <Badge variant="neutral">Draft</Badge>
                                )}
                              </Flex>
                              <Text variant="small" color="muted" className="line-clamp-2">
                                {entry.answer.replace(/\n/g, ' ').substring(0, 150)}
                                {entry.answer.length > 150 ? '...' : ''}
                              </Text>
                              <Flex gap="xs" className="flex-wrap">
                                {entry.keywords?.map((kw: string) => (
                                  <span key={kw} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                    {kw}
                                  </span>
                                ))}
                              </Flex>
                              <Flex gap="md">
                                <Text variant="small" color="muted">
                                  Order: {entry.sortOrder}
                                </Text>
                                <Text variant="small" color="muted">
                                  Views: {entry.viewCount}
                                </Text>
                                <Text variant="small" color="muted">
                                  Helpful: {entry.helpfulCount}/{entry.helpfulCount + entry.notHelpfulCount}
                                </Text>
                              </Flex>
                            </Stack>
                            <Flex gap="sm" className="flex-shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleTogglePublished(entry)}
                                disabled={updateMutation.isPending}
                              >
                                {entry.isPublished ? 'Unpublish' : 'Publish'}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditModal(entry)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleDelete(entry.id)}
                                disabled={deleteMutation.isPending}
                              >
                                Delete
                              </Button>
                            </Flex>
                          </Flex>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              ))}
            </Stack>
          ) : (
            <Alert variant="info">
              <Text>No FAQ entries found{search ? ` matching "${search}"` : ''}.</Text>
              <Text variant="small" className="mt-2">
                Click "Add FAQ Entry" to create your first entry.
              </Text>
            </Alert>
          )}
        </Stack>

        {/* Add FAQ Modal */}
        <Modal
          isOpen={addModal}
          onClose={() => { setAddModal(false); resetAddForm() }}
          size="lg"
        >
          <Stack spacing="md">
            <Text weight="bold" className="text-lg">Add FAQ Entry</Text>

            <Select
              label="Category"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
            >
              {CATEGORY_OPTIONS.map(cat => (
                <option key={cat} value={cat}>{CATEGORY_LABELS[cat] || cat}</option>
              ))}
            </Select>

            <Input
              label="Question"
              placeholder="How do I...?"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
            />

            <Textarea
              label="Answer"
              placeholder="Write the answer... (supports markdown-style formatting with \n for line breaks)"
              value={newAnswer}
              onChange={(e) => setNewAnswer(e.target.value)}
              rows={6}
            />

            <Input
              label="Keywords (comma-separated)"
              placeholder="create, band, new, start"
              value={newKeywords}
              onChange={(e) => setNewKeywords(e.target.value)}
            />

            <Input
              label="Related Pages (comma-separated, optional)"
              placeholder="/bands/create, /user-dashboard"
              value={newRelatedPages}
              onChange={(e) => setNewRelatedPages(e.target.value)}
            />

            <Flex gap="md">
              <Input
                label="Sort Order"
                type="number"
                value={newSortOrder.toString()}
                onChange={(e) => setNewSortOrder(parseInt(e.target.value) || 1)}
                className="w-24"
              />
              <label className="flex items-center gap-2 text-sm mt-6">
                <input
                  type="checkbox"
                  checked={newIsPublished}
                  onChange={(e) => setNewIsPublished(e.target.checked)}
                />
                Published
              </label>
            </Flex>

            <Flex gap="sm" justify="end">
              <Button variant="ghost" onClick={() => { setAddModal(false); resetAddForm() }}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleCreate}
                disabled={createMutation.isPending || !newQuestion.trim() || !newAnswer.trim()}
              >
                {createMutation.isPending ? 'Creating...' : 'Create Entry'}
              </Button>
            </Flex>
            {createMutation.error && (
              <Alert variant="danger">
                <Text variant="small">{createMutation.error.message}</Text>
              </Alert>
            )}
          </Stack>
        </Modal>

        {/* Edit FAQ Modal */}
        <Modal
          isOpen={editModal.open}
          onClose={() => setEditModal({ open: false, entry: null })}
          size="lg"
          title="Edit FAQ Entry"
        >
          <Stack spacing="md">
            <Select
              label="Category"
              value={editCategory}
              onChange={(e) => setEditCategory(e.target.value)}
            >
              {CATEGORY_OPTIONS.map(cat => (
                <option key={cat} value={cat}>{CATEGORY_LABELS[cat] || cat}</option>
              ))}
            </Select>

            <Input
              label="Question"
              placeholder="How do I...?"
              value={editQuestion}
              onChange={(e) => setEditQuestion(e.target.value)}
            />

            <Textarea
              label="Answer"
              placeholder="Write the answer..."
              value={editAnswer}
              onChange={(e) => setEditAnswer(e.target.value)}
              rows={6}
            />

            <Input
              label="Keywords (comma-separated)"
              placeholder="create, band, new, start"
              value={editKeywords}
              onChange={(e) => setEditKeywords(e.target.value)}
            />

            <Input
              label="Related Pages (comma-separated, optional)"
              placeholder="/bands/create, /user-dashboard"
              value={editRelatedPages}
              onChange={(e) => setEditRelatedPages(e.target.value)}
            />

            <Flex gap="md">
              <Input
                label="Sort Order"
                type="number"
                value={editSortOrder.toString()}
                onChange={(e) => setEditSortOrder(parseInt(e.target.value) || 1)}
                className="w-24"
              />
              <label className="flex items-center gap-2 text-sm mt-6">
                <input
                  type="checkbox"
                  checked={editIsPublished}
                  onChange={(e) => setEditIsPublished(e.target.checked)}
                />
                Published
              </label>
            </Flex>

            <Flex gap="sm" justify="end">
              <Button variant="ghost" onClick={() => setEditModal({ open: false, entry: null })}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleUpdate}
                disabled={updateMutation.isPending || !editQuestion.trim() || !editAnswer.trim()}
              >
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </Flex>
            {updateMutation.error && (
              <Alert variant="danger">
                <Text variant="small">{updateMutation.error.message}</Text>
              </Alert>
            )}
          </Stack>
        </Modal>
      </AdminLayout>
    </>
  )
}
