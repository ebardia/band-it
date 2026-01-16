'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { jwtDecode } from 'jwt-decode'
import {
  Heading,
  Text,
  Stack,
  Input,
  Button,
  useToast,
  Flex,
  Card,
  Alert,
  Loading,
  Badge,
  List,
  ListItem,
  BandLayout
} from '@/components/ui'
import { AppNav } from '@/components/AppNav'

export default function InviteMembersPage() {
  const router = useRouter()
  const params = useParams()
  const { showToast } = useToast()
  const slug = params.slug as string
  const [userId, setUserId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

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

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const { data: bandData } = trpc.band.getBySlug.useQuery(
    { slug },
    { enabled: !!slug }
  )

  const { data: recommendedData, isLoading: loadingRecommended } = trpc.band.getRecommendedUsers.useQuery(
    { bandId: bandData?.band?.id || '' },
    { enabled: !!bandData?.band?.id }
  )

  const { data: searchData, isLoading: loadingSearch } = trpc.band.searchUsers.useQuery(
    { query: debouncedQuery, bandId: bandData?.band?.id || '' },
    { enabled: !!bandData?.band?.id && debouncedQuery.length >= 2 }
  )

  const inviteMutation = trpc.band.inviteUser.useMutation({
    onSuccess: () => {
      showToast('Invitation sent!', 'success')
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  const handleInvite = (inviteeId: string) => {
    if (!userId || !bandData?.band) return
    inviteMutation.mutate({
      bandId: bandData.band.id,
      inviterId: userId,
      userId: inviteeId,
    })
  }

  // Check permissions
  const currentMember = bandData?.band?.members.find((m: any) => m.user.id === userId)
  const canApprove = currentMember && bandData?.band?.whoCanApprove.includes(currentMember.role)
  const isMember = !!currentMember

  if (!bandData?.band) {
    return (
      <>
        <AppNav />
        <BandLayout
          bandSlug={slug}
          bandName="Loading..."
          pageTitle="Invite Members"
          isMember={false}
          wide={true}
        >
          <Loading message="Loading..." />
        </BandLayout>
      </>
    )
  }

  return (
    <>
      <AppNav />
      <BandLayout
        bandSlug={slug}
        bandName={bandData.band.name}
        pageTitle="Invite Members"
        canApprove={canApprove}
        isMember={isMember}
        wide={true}
      >
        <Stack spacing="xl">
          {/* Recommended Users */}
          <Stack spacing="lg">
            <Heading level={2}>Recommended Users</Heading>
            <Text color="muted">These users match your band's needs</Text>

            {loadingRecommended ? (
              <Loading message="Finding matches..." />
            ) : recommendedData?.users && recommendedData.users.length > 0 ? (
              <Stack spacing="md">
                {recommendedData.users.map((user: any) => (
                  <Card key={user.id}>
                    <Stack spacing="md">
                      <Flex justify="between">
                        <Stack spacing="sm">
                          <Heading level={3}>{user.name}</Heading>
                          <Text variant="small" color="muted">{user.email}</Text>
                        </Stack>
                        <Badge variant="info">Score: {user.matchScore}</Badge>
                      </Flex>

                      {user.matches && user.matches.length > 0 && (
                        <Stack spacing="sm">
                          <Text variant="small" weight="semibold">Why they're a good fit:</Text>
                          <List>
                            {user.matches.map((match: string, idx: number) => (
                              <ListItem key={idx}>{match}</ListItem>
                            ))}
                          </List>
                        </Stack>
                      )}

                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleInvite(user.id)}
                        disabled={inviteMutation.isPending}
                      >
                        {inviteMutation.isPending ? 'Sending...' : 'Send Invite'}
                      </Button>
                    </Stack>
                  </Card>
                ))}
              </Stack>
            ) : (
              <Alert variant="info">
                <Text>No recommended users found at this time.</Text>
              </Alert>
            )}
          </Stack>

          {/* Search Users */}
          <Stack spacing="lg">
            <Heading level={2}>Search Users</Heading>
            <Input
              label="Search by name or email"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Start typing..."
              helperText="Search for existing Band IT users"
            />

            {loadingSearch && debouncedQuery.length >= 2 && (
              <Loading message="Searching..." />
            )}

            {searchData?.users && searchData.users.length > 0 && (
              <Stack spacing="md">
                {searchData.users.map((user: any) => (
                  <Card key={user.id}>
                    <Flex justify="between">
                      <Stack spacing="sm">
                        <Heading level={3}>{user.name}</Heading>
                        <Text variant="small" color="muted">{user.email}</Text>
                      </Stack>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleInvite(user.id)}
                        disabled={inviteMutation.isPending}
                      >
                        {inviteMutation.isPending ? 'Sending...' : 'Send Invite'}
                      </Button>
                    </Flex>
                  </Card>
                ))}
              </Stack>
            )}

            {debouncedQuery.length >= 2 && searchData?.users && searchData.users.length === 0 && (
              <Alert variant="info">
                <Text>No users found. They can register at Band IT first, then you can invite them!</Text>
              </Alert>
            )}
          </Stack>
        </Stack>
      </BandLayout>
    </>
  )
}
