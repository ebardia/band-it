'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { jwtDecode } from 'jwt-decode'
import {
  Heading,
  Text,
  Stack,
  Card,
  Loading,
  Alert,
  AdminLayout,
  Flex,
  Button,
  Input,
  Textarea,
  useToast
} from '@/components/ui'
import { AppNav } from '@/components/AppNav'

export default function CreateBigBandPage() {
  const router = useRouter()
  const { showToast } = useToast()
  const [userId, setUserId] = useState<string | null>(null)
  const [founderSearch, setFounderSearch] = useState('')
  const [selectedFounder, setSelectedFounder] = useState<{
    id: string
    name: string
    email: string
  } | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    mission: '',
    values: '',
    membershipRequirements: '',
    zipcode: '',
    imageUrl: '',
  })

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

  const { data: profileData, isLoading: profileLoading } = trpc.auth.getProfile.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  )

  const { data: searchResults, isLoading: searchLoading } = trpc.admin.searchUsersForFounder.useQuery(
    { adminUserId: userId!, search: founderSearch },
    {
      enabled: !!userId && profileData?.user?.isAdmin && founderSearch.length >= 2,
    }
  )

  const createBigBandMutation = trpc.admin.createBigBand.useMutation({
    onSuccess: (data) => {
      showToast('Big Band created successfully!', 'success')
      router.push('/admin/bands')
    },
    onError: (error) => {
      showToast(error.message || 'Failed to create Big Band', 'error')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!userId || !selectedFounder) {
      showToast('Please select a founder', 'error')
      return
    }

    createBigBandMutation.mutate({
      adminUserId: userId,
      founderId: selectedFounder.id,
      ...formData,
      zipcode: formData.zipcode || undefined,
      imageUrl: formData.imageUrl || undefined,
    })
  }

  if (profileLoading) {
    return (
      <>
        <AppNav />
        <AdminLayout pageTitle="Create Big Band" subtitle="Loading...">
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

  return (
    <>
      <AppNav />
      <AdminLayout pageTitle="Create Big Band" subtitle="Create a new Big Band with an assigned founder">
        <form onSubmit={handleSubmit}>
          <Stack spacing="lg">
            {/* Founder Selection */}
            <Card>
              <Stack spacing="md">
                <Heading level={2}>Select Founder</Heading>
                <Text color="muted">Search for a user to assign as the Big Band founder</Text>

                {selectedFounder ? (
                  <Flex justify="between" align="center" className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <Stack spacing="xs">
                      <Text weight="semibold">{selectedFounder.name}</Text>
                      <Text variant="small" color="muted">{selectedFounder.email}</Text>
                    </Stack>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedFounder(null)}
                    >
                      Change
                    </Button>
                  </Flex>
                ) : (
                  <>
                    <Input
                      label="Search Users"
                      type="text"
                      value={founderSearch}
                      onChange={(e) => setFounderSearch(e.target.value)}
                      placeholder="Search by name or email..."
                    />
                    {searchLoading && <Loading message="Searching..." />}
                    {searchResults?.users && searchResults.users.length > 0 && (
                      <div className="border rounded-lg divide-y">
                        {searchResults.users.map((user) => (
                          <Flex
                            key={user.id}
                            justify="between"
                            align="center"
                            className="p-3 hover:bg-gray-50 cursor-pointer"
                            onClick={() => {
                              setSelectedFounder(user)
                              setFounderSearch('')
                            }}
                          >
                            <Stack spacing="xs">
                              <Text weight="semibold">{user.name}</Text>
                              <Text variant="small" color="muted">{user.email}</Text>
                            </Stack>
                            {user.emailVerified && (
                              <Text variant="small" className="text-green-600">Verified</Text>
                            )}
                          </Flex>
                        ))}
                      </div>
                    )}
                    {founderSearch.length >= 2 && !searchLoading && searchResults?.users?.length === 0 && (
                      <Text color="muted">No users found</Text>
                    )}
                  </>
                )}
              </Stack>
            </Card>

            {/* Band Details */}
            <Card>
              <Stack spacing="md">
                <Heading level={2}>Band Details</Heading>

                <Input
                  label="Band Name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter Big Band name"
                />

                <Textarea
                  label="Description"
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe this Big Band..."
                  rows={4}
                  helperText="At least 10 characters"
                />

                <Textarea
                  label="Mission Statement"
                  required
                  value={formData.mission}
                  onChange={(e) => setFormData({ ...formData, mission: e.target.value })}
                  placeholder="What is this Big Band's mission?"
                  rows={3}
                  helperText="At least 10 characters"
                />

                <Textarea
                  label="Values"
                  required
                  value={formData.values}
                  onChange={(e) => setFormData({ ...formData, values: e.target.value })}
                  placeholder="Community, Excellence, Collaboration"
                  rows={2}
                  helperText="Separate with commas"
                />

                <Textarea
                  label="Membership Requirements"
                  required
                  value={formData.membershipRequirements}
                  onChange={(e) => setFormData({ ...formData, membershipRequirements: e.target.value })}
                  placeholder="Requirements for joining this Big Band..."
                  rows={3}
                  helperText="At least 10 characters"
                />

                <Flex gap="md">
                  <Input
                    label="Zipcode (Optional)"
                    type="text"
                    value={formData.zipcode}
                    onChange={(e) => setFormData({ ...formData, zipcode: e.target.value })}
                    placeholder="12345"
                    maxLength={5}
                  />
                  <Input
                    label="Image URL (Optional)"
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    placeholder="https://..."
                    className="flex-1"
                  />
                </Flex>
              </Stack>
            </Card>

            {/* Actions */}
            <Flex gap="md" justify="end">
              <Button
                type="button"
                variant="ghost"
                size="lg"
                onClick={() => router.push('/admin/bands')}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={!selectedFounder || createBigBandMutation.isPending}
              >
                {createBigBandMutation.isPending ? 'Creating...' : 'Create Big Band'}
              </Button>
            </Flex>
          </Stack>
        </form>
      </AdminLayout>
    </>
  )
}
