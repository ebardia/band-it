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

export default function AdminBlockedTermsPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterSeverity, setFilterSeverity] = useState<'WARN' | 'BLOCK' | ''>('')
  const [showInactive, setShowInactive] = useState(false)
  const utils = trpc.useUtils()

  // Modal states
  const [addModal, setAddModal] = useState(false)
  const [editModal, setEditModal] = useState<{ open: boolean; term: any }>({ open: false, term: null })
  const [bulkModal, setBulkModal] = useState(false)

  // Form states - Add Term
  const [newTerm, setNewTerm] = useState('')
  const [newIsRegex, setNewIsRegex] = useState(false)
  const [newSeverity, setNewSeverity] = useState<'WARN' | 'BLOCK'>('WARN')
  const [newCategory, setNewCategory] = useState('')
  const [newReason, setNewReason] = useState('')
  const [newConfidence, setNewConfidence] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('HIGH')
  const [newUserAppealAllowed, setNewUserAppealAllowed] = useState(true)

  // Form states - Edit Term
  const [editTerm, setEditTerm] = useState('')
  const [editIsRegex, setEditIsRegex] = useState(false)
  const [editSeverity, setEditSeverity] = useState<'WARN' | 'BLOCK'>('WARN')
  const [editCategory, setEditCategory] = useState('')
  const [editIsActive, setEditIsActive] = useState(true)
  const [editReason, setEditReason] = useState('')
  const [editConfidence, setEditConfidence] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('HIGH')
  const [editUserAppealAllowed, setEditUserAppealAllowed] = useState(true)

  // Form states - Bulk Add
  const [bulkTerms, setBulkTerms] = useState('')
  const [bulkSeverity, setBulkSeverity] = useState<'WARN' | 'BLOCK'>('WARN')
  const [bulkCategory, setBulkCategory] = useState('')

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

  const { data: termsData, isLoading: termsLoading } = trpc.admin.getBlockedTerms.useQuery(
    {
      adminUserId: userId!,
      search: search || undefined,
      category: filterCategory || undefined,
      severity: filterSeverity || undefined,
      activeOnly: !showInactive,
    },
    { enabled: !!userId && profileData?.user?.isAdmin }
  )

  const addMutation = trpc.admin.addBlockedTerm.useMutation({
    onSuccess: () => {
      utils.admin.getBlockedTerms.invalidate()
      setAddModal(false)
      resetAddForm()
    },
  })

  const updateMutation = trpc.admin.updateBlockedTerm.useMutation({
    onSuccess: () => {
      utils.admin.getBlockedTerms.invalidate()
      setEditModal({ open: false, term: null })
    },
  })

  const deleteMutation = trpc.admin.deleteBlockedTerm.useMutation({
    onSuccess: () => {
      utils.admin.getBlockedTerms.invalidate()
    },
  })

  const bulkAddMutation = trpc.admin.bulkAddBlockedTerms.useMutation({
    onSuccess: (data) => {
      utils.admin.getBlockedTerms.invalidate()
      setBulkModal(false)
      resetBulkForm()
      alert(`Added ${data.added} terms, skipped ${data.skipped} duplicates`)
    },
  })

  const resetAddForm = () => {
    setNewTerm('')
    setNewIsRegex(false)
    setNewSeverity('WARN')
    setNewCategory('')
    setNewReason('')
    setNewConfidence('HIGH')
    setNewUserAppealAllowed(true)
  }

  const resetBulkForm = () => {
    setBulkTerms('')
    setBulkSeverity('WARN')
    setBulkCategory('')
  }

  const openEditModal = (term: any) => {
    setEditTerm(term.term)
    setEditIsRegex(term.isRegex)
    setEditSeverity(term.severity)
    setEditCategory(term.category || '')
    setEditIsActive(term.isActive)
    setEditReason(term.reason || '')
    setEditConfidence(term.confidence || 'HIGH')
    setEditUserAppealAllowed(term.userAppealAllowed ?? true)
    setEditModal({ open: true, term })
  }

  if (profileLoading) {
    return (
      <>
        <AppNav />
        <AdminLayout pageTitle="Blocked Terms" subtitle="Loading...">
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

  const handleAdd = () => {
    if (!newTerm.trim()) return
    addMutation.mutate({
      adminUserId: userId!,
      term: newTerm.trim(),
      isRegex: newIsRegex,
      severity: newSeverity,
      category: newCategory || undefined,
      reason: newReason || undefined,
      confidence: newConfidence,
      userAppealAllowed: newUserAppealAllowed,
    })
  }

  const handleUpdate = () => {
    if (!editModal.term || !editTerm.trim()) return
    updateMutation.mutate({
      adminUserId: userId!,
      termId: editModal.term.id,
      term: editTerm.trim(),
      isRegex: editIsRegex,
      severity: editSeverity,
      category: editCategory || null,
      isActive: editIsActive,
      reason: editReason || null,
      confidence: editConfidence,
      userAppealAllowed: editUserAppealAllowed,
    })
  }

  const handleDelete = (termId: string) => {
    if (confirm('Are you sure you want to delete this blocked term?')) {
      deleteMutation.mutate({
        adminUserId: userId!,
        termId,
      })
    }
  }

  const handleBulkAdd = () => {
    const terms = bulkTerms
      .split('\n')
      .map(t => t.trim())
      .filter(t => t.length > 0)

    if (terms.length === 0) return

    bulkAddMutation.mutate({
      adminUserId: userId!,
      terms,
      severity: bulkSeverity,
      category: bulkCategory || undefined,
    })
  }

  return (
    <>
      <AppNav />
      <AdminLayout pageTitle="Blocked Terms" subtitle="Manage keyword blocklist">
        <Stack spacing="lg">
          {/* Actions Bar */}
          <Flex gap="md" justify="between" wrap="wrap">
            <Flex gap="sm" wrap="wrap">
              <Input
                placeholder="Search terms..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-48"
              />
              <Select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value as any)}
                className="w-32"
              >
                <option value="">All Severity</option>
                <option value="WARN">Warn</option>
                <option value="BLOCK">Block</option>
              </Select>
              {termsData?.categories && termsData.categories.length > 0 && (
                <Select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-40"
                >
                  <option value="">All Categories</option>
                  {termsData.categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </Select>
              )}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                />
                Show inactive
              </label>
            </Flex>
            <Flex gap="sm">
              <Button variant="secondary" size="sm" onClick={() => setBulkModal(true)}>
                Bulk Add
              </Button>
              <Button variant="primary" size="sm" onClick={() => setAddModal(true)}>
                Add Term
              </Button>
            </Flex>
          </Flex>

          {/* Terms List */}
          {termsLoading ? (
            <Loading message="Loading blocked terms..." />
          ) : termsData?.terms && termsData.terms.length > 0 ? (
            <Card>
              <div className="divide-y divide-gray-100">
                {termsData.terms.map((term: any) => (
                  <Flex
                    key={term.id}
                    justify="between"
                    align="center"
                    className="py-3"
                  >
                    <Stack spacing="sm">
                      <Flex gap="sm" align="center" className="flex-wrap">
                        <Text weight="semibold" className={!term.isActive ? 'text-gray-400' : ''}>
                          {term.term}
                        </Text>
                        <Badge variant={term.severity === 'BLOCK' ? 'danger' : 'warning'}>
                          {term.severity}
                        </Badge>
                        {term.isRegex && (
                          <Badge variant="info">Regex</Badge>
                        )}
                        {term.category && (
                          <Badge variant="neutral">{term.category}</Badge>
                        )}
                        <Badge variant={term.confidence === 'HIGH' ? 'success' : term.confidence === 'MEDIUM' ? 'warning' : 'danger'}>
                          {term.confidence || 'HIGH'}
                        </Badge>
                        {!term.userAppealAllowed && (
                          <Badge variant="danger">No Appeals</Badge>
                        )}
                        {!term.isActive && (
                          <Badge variant="neutral">Inactive</Badge>
                        )}
                      </Flex>
                      {term.reason && (
                        <Text variant="small" color="muted" className="italic">
                          {term.reason}
                        </Text>
                      )}
                      <Text variant="small" color="muted">
                        Added by {term.createdBy.name} on {new Date(term.createdAt).toLocaleDateString()}
                      </Text>
                    </Stack>
                    <Flex gap="sm">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(term)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(term.id)}
                        disabled={deleteMutation.isPending}
                      >
                        Delete
                      </Button>
                    </Flex>
                  </Flex>
                ))}
              </div>
            </Card>
          ) : (
            <Alert variant="info">
              <Text>No blocked terms configured{search ? ` matching "${search}"` : ''}.</Text>
              <Text variant="small" className="mt-2">
                Add terms to automatically flag or block content containing those words.
              </Text>
            </Alert>
          )}

          {/* Info Card */}
          <Card>
            <Stack spacing="sm">
              <Text weight="semibold">How it works</Text>
              <Text variant="small" color="muted">
                <strong>WARN:</strong> Content is flagged for review but still posted. The user is not notified.
              </Text>
              <Text variant="small" color="muted">
                <strong>BLOCK:</strong> Content is rejected and cannot be posted. The user sees an error message.
              </Text>
              <Text variant="small" color="muted">
                <strong>Regex:</strong> Enable regex patterns for advanced matching (e.g., "sp[a@]m" matches "spam" and "sp@m").
              </Text>
            </Stack>
          </Card>
        </Stack>

        {/* Add Term Modal */}
        <Modal
          isOpen={addModal}
          onClose={() => {
            setAddModal(false)
            resetAddForm()
          }}
        >
          <Stack spacing="md">
            <Text weight="bold" className="text-lg">Add Blocked Term</Text>
            <Input
              label="Term or Pattern"
              placeholder="Enter word or phrase..."
              value={newTerm}
              onChange={(e) => setNewTerm(e.target.value)}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={newIsRegex}
                onChange={(e) => setNewIsRegex(e.target.checked)}
              />
              Treat as regex pattern
            </label>
            <Select
              label="Severity"
              value={newSeverity}
              onChange={(e) => setNewSeverity(e.target.value as 'WARN' | 'BLOCK')}
            >
              <option value="WARN">Warn (flag for review)</option>
              <option value="BLOCK">Block (prevent posting)</option>
            </Select>
            <Select
              label="Confidence"
              value={newConfidence}
              onChange={(e) => setNewConfidence(e.target.value as 'HIGH' | 'MEDIUM' | 'LOW')}
            >
              <option value="HIGH">High (exact match, auto-action safe)</option>
              <option value="MEDIUM">Medium (may have false positives, always review)</option>
              <option value="LOW">Low (broad pattern, flag only with multiple matches)</option>
            </Select>
            <Input
              label="Category (optional)"
              placeholder="e.g., profanity, spam, hate speech"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
            />
            <Input
              label="Reason (optional)"
              placeholder="Human-readable explanation shown to admins"
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={newUserAppealAllowed}
                onChange={(e) => setNewUserAppealAllowed(e.target.checked)}
              />
              Allow users to appeal content flagged by this term
            </label>
            <Flex gap="sm" justify="end">
              <Button variant="ghost" onClick={() => { setAddModal(false); resetAddForm() }}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleAdd}
                disabled={addMutation.isPending || !newTerm.trim()}
              >
                {addMutation.isPending ? 'Adding...' : 'Add Term'}
              </Button>
            </Flex>
            {addMutation.error && (
              <Alert variant="danger">
                <Text variant="small">{addMutation.error.message}</Text>
              </Alert>
            )}
          </Stack>
        </Modal>

        {/* Edit Term Modal */}
        <Modal
          isOpen={editModal.open}
          onClose={() => setEditModal({ open: false, term: null })}
          title="Edit Blocked Term"
        >
          <Stack spacing="md">
            <Input
              label="Term or Pattern"
              placeholder="Enter word or phrase..."
              value={editTerm}
              onChange={(e) => setEditTerm(e.target.value)}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editIsRegex}
                onChange={(e) => setEditIsRegex(e.target.checked)}
              />
              Treat as regex pattern
            </label>
            <Select
              label="Severity"
              value={editSeverity}
              onChange={(e) => setEditSeverity(e.target.value as 'WARN' | 'BLOCK')}
            >
              <option value="WARN">Warn (flag for review)</option>
              <option value="BLOCK">Block (prevent posting)</option>
            </Select>
            <Select
              label="Confidence"
              value={editConfidence}
              onChange={(e) => setEditConfidence(e.target.value as 'HIGH' | 'MEDIUM' | 'LOW')}
            >
              <option value="HIGH">High (exact match, auto-action safe)</option>
              <option value="MEDIUM">Medium (may have false positives, always review)</option>
              <option value="LOW">Low (broad pattern, flag only with multiple matches)</option>
            </Select>
            <Input
              label="Category (optional)"
              placeholder="e.g., profanity, spam, hate speech"
              value={editCategory}
              onChange={(e) => setEditCategory(e.target.value)}
            />
            <Input
              label="Reason (optional)"
              placeholder="Human-readable explanation shown to admins"
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editUserAppealAllowed}
                onChange={(e) => setEditUserAppealAllowed(e.target.checked)}
              />
              Allow users to appeal content flagged by this term
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editIsActive}
                onChange={(e) => setEditIsActive(e.target.checked)}
              />
              Active (uncheck to disable without deleting)
            </label>
            <Flex gap="sm" justify="end">
              <Button variant="ghost" onClick={() => setEditModal({ open: false, term: null })}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleUpdate}
                disabled={updateMutation.isPending || !editTerm.trim()}
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

        {/* Bulk Add Modal */}
        <Modal
          isOpen={bulkModal}
          onClose={() => {
            setBulkModal(false)
            resetBulkForm()
          }}
          title="Bulk Add Blocked Terms"
        >
          <Stack spacing="md">
            <Textarea
              label="Terms (one per line)"
              placeholder="Enter terms, one per line..."
              value={bulkTerms}
              onChange={(e) => setBulkTerms(e.target.value)}
              rows={8}
            />
            <Select
              label="Severity for all"
              value={bulkSeverity}
              onChange={(e) => setBulkSeverity(e.target.value as 'WARN' | 'BLOCK')}
            >
              <option value="WARN">Warn (flag for review)</option>
              <option value="BLOCK">Block (prevent posting)</option>
            </Select>
            <Input
              label="Category for all (optional)"
              placeholder="e.g., profanity, spam"
              value={bulkCategory}
              onChange={(e) => setBulkCategory(e.target.value)}
            />
            <Text variant="small" color="muted">
              Duplicate terms will be skipped. Terms are case-insensitive.
            </Text>
            <Flex gap="sm" justify="end">
              <Button variant="ghost" onClick={() => { setBulkModal(false); resetBulkForm() }}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleBulkAdd}
                disabled={bulkAddMutation.isPending || !bulkTerms.trim()}
              >
                {bulkAddMutation.isPending ? 'Adding...' : 'Add Terms'}
              </Button>
            </Flex>
            {bulkAddMutation.error && (
              <Alert variant="danger">
                <Text variant="small">{bulkAddMutation.error.message}</Text>
              </Alert>
            )}
          </Stack>
        </Modal>
      </AdminLayout>
    </>
  )
}
