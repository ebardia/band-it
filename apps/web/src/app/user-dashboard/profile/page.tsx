'use client'

import { useState, useEffect, useMemo } from 'react'
import { UserDashboardLayout } from '@/components/UserDashboardLayout'
import { trpc } from '@/lib/trpc'
import { jwtDecode } from 'jwt-decode'
import { Loading, useToast } from '@/components/ui'
import { buildProfileSummaryText, toChips } from '@/lib/profileSummary'

function uniqueChips(...groups: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const g of groups) {
    for (const c of toChips(g, 20)) {
      const k = c.toLowerCase()
      if (seen.has(k)) continue
      seen.add(k)
      out.push(c)
      if (out.length >= 24) return out
    }
  }
  return out
}

export default function ProfilePage() {
  const { showToast } = useToast()
  const [userId, setUserId] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    zipcode: '',
    strengths: '',
    weaknesses: '',
    passions: '',
    developmentPath: '',
  })

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      try {
        const decoded: { userId: string } = jwtDecode(token)
        setUserId(decoded.userId)
      } catch (error) {
        console.error('Invalid token:', error)
      }
    }
  }, [])

  const { data: profileData, isLoading } = trpc.auth.getProfile.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  )

  const updateProfileMutation = trpc.auth.updateProfile.useMutation({
    onSuccess: () => {
      showToast('Profile updated successfully!', 'success')
      setIsEditing(false)
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  useEffect(() => {
    if (profileData?.user) {
      setFormData({
        zipcode: profileData.user.zipcode || '',
        strengths: profileData.user.strengths?.join(', ') || '',
        weaknesses: profileData.user.weaknesses?.join(', ') || '',
        passions: profileData.user.passions?.join(', ') || '',
        developmentPath: profileData.user.developmentPath?.join(', ') || '',
      })
    }
  }, [profileData])

  const summaryText = useMemo(() => {
    if (!profileData?.user) return ''
    const u = profileData.user
    return buildProfileSummaryText({
      name: u.name || 'Member',
      zipcode: u.zipcode,
      strengths: u.strengths ?? [],
      weaknesses: u.weaknesses ?? [],
      passions: u.passions ?? [],
      developmentPath: u.developmentPath ?? [],
    })
  }, [profileData])

  const chips = useMemo(
    () => uniqueChips(formData.strengths, formData.passions, formData.developmentPath),
    [formData.strengths, formData.passions, formData.developmentPath]
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return

    updateProfileMutation.mutate({
      userId,
      ...formData,
    })
  }

  const handleCancel = () => {
    if (profileData?.user) {
      setFormData({
        zipcode: profileData.user.zipcode || '',
        strengths: profileData.user.strengths?.join(', ') || '',
        weaknesses: profileData.user.weaknesses?.join(', ') || '',
        passions: profileData.user.passions?.join(', ') || '',
        developmentPath: profileData.user.developmentPath?.join(', ') || '',
      })
    }
    setIsEditing(false)
  }

  if (isLoading || !userId) {
    return (
      <UserDashboardLayout pageTitle="My Profile" editorial>
        <div className="np-profile-shell">
          <Loading message="Loading profile…" />
        </div>
      </UserDashboardLayout>
    )
  }

  const user = profileData?.user
  if (!user) {
    return (
      <UserDashboardLayout pageTitle="My Profile" editorial>
        <div className="np-profile-shell">
          <p className="np-quiet">We couldn&apos;t load your profile.</p>
        </div>
      </UserDashboardLayout>
    )
  }

  const memberSince = new Date(user.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const readBlock = (body: string) => (
    <p className="np-profile-read">{body.trim() ? body : '—'}</p>
  )

  return (
    <UserDashboardLayout pageTitle="My Profile" editorial>
      <div className="np-profile-shell">
        <p className="np-cat">YOUR EDITION</p>
        <p className="np-profile-dek-lead">
          This is the home for who you are on Band It—not only your bands and projects. What you save
          here shapes your Daily edition: work that might fit you, causes and hobbies, and the occasional
          cultural signal we think you&apos;ll like.
        </p>

        <hr className="np-rule" />

        <p className="np-profile-meta-row">
          {user.name?.toUpperCase() || 'MEMBER'}
          <br />
          {user.email?.toUpperCase()}
          <br />
          MEMBER SINCE {memberSince.toUpperCase()}
        </p>

        <section className="np-profile-section" aria-labelledby="summary-heading">
          <h2 id="summary-heading" className="np-picks-header">
            Your summary
          </h2>
          <p className="np-profile-manifesto np-profile-summary-lead">{summaryText}</p>
          {chips.length > 0 ? (
            <div className="np-chip-row np-chip-row-left" aria-label="Profile tags">
              {chips.map((c) => (
                <span key={c} className="np-chip">
                  {c}
                </span>
              ))}
            </div>
          ) : null}
        </section>

        <p className="np-profile-manifesto">
          No one builds something meaningful alone. Groups thrive when people bring different gifts to
          the table. By understanding what you&apos;re good at, what moves you, and where you want to
          grow—our systems try to help you find where you belong, and over time, become more effective
          there.
        </p>

        <form onSubmit={handleSubmit}>
          <section className="np-profile-section" aria-labelledby="place-heading">
            <p className="np-cat np-cat-left">
              Place
            </p>
            <h3 id="place-heading" className="np-headline-serif">
              Where you&apos;re based
            </h3>
            {isEditing ? (
              <>
                <label className="np-label" htmlFor="zip">
                  Postal code
                </label>
                <input
                  id="zip"
                  className="np-field"
                  type="text"
                  required
                  value={formData.zipcode}
                  onChange={(e) => setFormData({ ...formData, zipcode: e.target.value })}
                  maxLength={10}
                />
                <p className="np-field-hint">Used for local signals in your edition.</p>
              </>
            ) : (
              readBlock(formData.zipcode || 'Add a postal code when you edit your profile.')
            )}
          </section>

          <section className="np-profile-section" aria-labelledby="skills-heading">
            <p className="np-cat np-cat-left">
              Skills
            </p>
            <h3 id="skills-heading" className="np-headline-serif">
              What you&apos;re good at
            </h3>
            {isEditing ? (
              <>
                <label className="np-label" htmlFor="strengths">
                  Strengths
                </label>
                <textarea
                  id="strengths"
                  className="np-field"
                  required
                  rows={4}
                  value={formData.strengths}
                  onChange={(e) => setFormData({ ...formData, strengths: e.target.value })}
                />
                <p className="np-field-hint">Separate with commas.</p>
              </>
            ) : (
              readBlock(formData.strengths)
            )}
          </section>

          <section className="np-profile-section" aria-labelledby="growth-heading">
            <p className="np-cat np-cat-left">
              Growth
            </p>
            <h3 id="growth-heading" className="np-headline-serif">
              Where you&apos;re stretching
            </h3>
            {isEditing ? (
              <>
                <label className="np-label" htmlFor="weaknesses">
                  Areas for improvement
                </label>
                <textarea
                  id="weaknesses"
                  className="np-field"
                  required
                  rows={4}
                  value={formData.weaknesses}
                  onChange={(e) => setFormData({ ...formData, weaknesses: e.target.value })}
                />
                <p className="np-field-hint">Separate with commas.</p>
              </>
            ) : (
              readBlock(formData.weaknesses)
            )}
          </section>

          <section className="np-profile-section" aria-labelledby="passions-heading">
            <p className="np-cat np-cat-left">
              Interests
            </p>
            <h3 id="passions-heading" className="np-headline-serif">
              What moves you
            </h3>
            {isEditing ? (
              <>
                <label className="np-label" htmlFor="passions">
                  Passions
                </label>
                <textarea
                  id="passions"
                  className="np-field"
                  required
                  rows={4}
                  value={formData.passions}
                  onChange={(e) => setFormData({ ...formData, passions: e.target.value })}
                />
                <p className="np-field-hint">Separate with commas.</p>
              </>
            ) : (
              readBlock(formData.passions)
            )}
          </section>

          <section className="np-profile-section" aria-labelledby="learn-heading">
            <p className="np-cat np-cat-left">
              Learning
            </p>
            <h3 id="learn-heading" className="np-headline-serif">
              What you want to learn next
            </h3>
            {isEditing ? (
              <>
                <label className="np-label" htmlFor="developmentPath">
                  Development path
                </label>
                <textarea
                  id="developmentPath"
                  className="np-field"
                  required
                  rows={4}
                  value={formData.developmentPath}
                  onChange={(e) => setFormData({ ...formData, developmentPath: e.target.value })}
                />
                <p className="np-field-hint">Separate with commas.</p>
              </>
            ) : (
              readBlock(formData.developmentPath)
            )}
          </section>

          <div className="np-profile-actions">
            {isEditing ? (
              <>
                <button
                  type="submit"
                  className="np-profile-btn np-profile-btn-primary"
                  disabled={updateProfileMutation.isPending}
                >
                  {updateProfileMutation.isPending ? 'Saving…' : 'Save changes'}
                </button>
                <button type="button" className="np-profile-btn" onClick={handleCancel}>
                  Cancel
                </button>
              </>
            ) : (
              <button type="button" className="np-profile-btn np-profile-btn-primary" onClick={() => setIsEditing(true)}>
                Edit profile
              </button>
            )}
          </div>
        </form>
      </div>
    </UserDashboardLayout>
  )
}
