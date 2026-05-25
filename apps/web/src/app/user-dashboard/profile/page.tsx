'use client'

import { useState, useEffect, useMemo } from 'react'
import { UserDashboardLayout } from '@/components/UserDashboardLayout'
import { trpc } from '@/lib/trpc'
import { jwtDecode } from 'jwt-decode'
import { Loading, useToast } from '@/components/ui'
import { LocationAutocomplete } from '@/components/profile/LocationAutocomplete'
import { TaxonomySelect } from '@/components/profile/TaxonomySelect'
import { ResumeSection } from '@/components/profile/ResumeSection'
import {
  EMPTY_PROFILE_FORM,
  type EndUserProfileForm,
  type ProfileTaxonomyCategory,
} from '@/lib/endUserProfile'
import { buildProfileSummaryText, taxonomyChipLabels } from '@/lib/profileSummary'
import { buildEditionPreviewLines, buildNextMoves, countProfileSignals } from '@/lib/profileSignals'

type PendingUpload = {
  fileName: string
  mimeType: string
  base64Data: string
}

function profileToForm(profile: {
  locationId: string | null
  location: { label: string; city?: string; state?: string; zip?: string } | null
  resumeText: string | null
  resumeFileId: string | null
  resumeFile: { originalName: string } | null
  workExperience: unknown
  education: unknown
  certifications: unknown
  skills: EndUserProfileForm['skills']
  causes: EndUserProfileForm['causes']
  playInterests: EndUserProfileForm['playInterests']
}): EndUserProfileForm {
  return {
    locationId: profile.locationId ?? '',
    locationLabel: profile.location?.label ?? '',
    locationCity: profile.location?.city ?? '',
    locationState: profile.location?.state ?? '',
    locationZip: profile.location?.zip ?? '',
    resumeText: profile.resumeText ?? '',
    resumeFileId: profile.resumeFileId,
    resumeFileName: profile.resumeFile?.originalName ?? null,
    workExperience: (profile.workExperience as EndUserProfileForm['workExperience']) ?? [],
    education: (profile.education as EndUserProfileForm['education']) ?? [],
    certifications: (profile.certifications as EndUserProfileForm['certifications']) ?? [],
    skills: profile.skills,
    causes: profile.causes,
    playInterests: profile.playInterests,
  }
}

export default function ProfilePage() {
  const { showToast } = useToast()
  const utils = trpc.useUtils()
  const [userId, setUserId] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<EndUserProfileForm>(EMPTY_PROFILE_FORM)
  const [pendingUpload, setPendingUpload] = useState<PendingUpload | null>(null)

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

  const { data: profileData, isLoading } = trpc.profile.get.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  )

  const { data: skillTaxonomy } = trpc.profile.getTaxonomy.useQuery({ kind: 'SKILL' })
  const { data: causeTaxonomy } = trpc.profile.getTaxonomy.useQuery({ kind: 'CAUSE' })
  const { data: playTaxonomy } = trpc.profile.getTaxonomy.useQuery({ kind: 'PLAY' })

  const skillCategories = (skillTaxonomy?.categories ?? []) as ProfileTaxonomyCategory[]
  const causeCategories = (causeTaxonomy?.categories ?? []) as ProfileTaxonomyCategory[]
  const playCategories = (playTaxonomy?.categories ?? []) as ProfileTaxonomyCategory[]

  const updateMutation = trpc.profile.update.useMutation({
    onSuccess: async (data) => {
      if (data.profile) {
        setFormData(profileToForm(data.profile))
      }
      showToast('Profile saved — your summary is updated.', 'success')
      setIsEditing(false)
      setPendingUpload(null)
      if (userId) await utils.profile.get.invalidate({ userId })
    },
    onError: (error) => showToast(error.message, 'error'),
  })

  const parseMutation = trpc.profile.parseResume.useMutation({
    onSuccess: (result) => {
      setFormData((prev) => ({
        ...prev,
        resumeText: result.resumeText,
        workExperience: result.parsed.workExperience,
        education: result.parsed.education,
        certifications: result.parsed.certifications,
        skills: {
          categoryIds: [
            ...new Set([
              ...prev.skills.categoryIds,
              ...result.parsed.suggestedSkillCategoryIds,
            ]),
          ],
          itemIds: [
            ...new Set([...prev.skills.itemIds, ...result.parsed.suggestedSkillItemIds]),
          ],
        },
      }))
      showToast('Résumé decoded — skills updated from your experience.', 'success')
    },
    onError: (error) => showToast(error.message, 'error'),
  })

  const suggestSkillsQuery = trpc.profile.suggestSkills.useQuery(
    {
      workExperience: formData.workExperience,
      education: formData.education,
      resumeText: formData.resumeText,
    },
    { enabled: false }
  )

  const applySuggestedSkills = async () => {
    const result = await suggestSkillsQuery.refetch()
    const skills = result.data?.skills
    if (!skills) return
    setFormData((prev) => ({
      ...prev,
      skills: {
        categoryIds: [...new Set([...prev.skills.categoryIds, ...skills.categoryIds])],
        itemIds: [...new Set([...prev.skills.itemIds, ...skills.itemIds])],
      },
    }))
    showToast('Skills matched from your résumé — adjust anything we missed.', 'success')
  }

  useEffect(() => {
    if (profileData?.profile && !isEditing) {
      setFormData(profileToForm(profileData.profile))
      setPendingUpload(null)
    }
  }, [profileData, isEditing])

  useEffect(() => {
    if (profileData?.profile && !profileData.profile.profileCompleted) {
      setIsEditing(true)
    }
  }, [profileData?.profile?.profileCompleted])

  const summaryText = useMemo(() => {
    if (!profileData?.profile) return ''
    return buildProfileSummaryText({
      name: profileData.profile.name || 'Member',
      locationLabel: formData.locationLabel,
      form: formData,
      skillCategories,
      causeCategories,
      playCategories,
    })
  }, [profileData, formData, skillCategories, causeCategories, playCategories])

  const skillChips = useMemo(
    () => taxonomyChipLabels(formData, 'skills', skillCategories),
    [formData, skillCategories]
  )
  const allChips = useMemo(
    () => [
      ...skillChips,
      ...taxonomyChipLabels(formData, 'causes', causeCategories),
      ...taxonomyChipLabels(formData, 'playInterests', playCategories),
    ].slice(0, 24),
    [formData, skillChips, causeCategories, playCategories]
  )

  const signalStats = useMemo(() => countProfileSignals(formData), [formData])
  const nextMovesList = useMemo(() => buildNextMoves(formData), [formData])
  const editionPreviewLines = useMemo(
    () => buildEditionPreviewLines(formData, allChips),
    [formData, allChips]
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return

    if (!formData.locationId) {
      showToast('Place is required — pick a city from the list.', 'error')
      return
    }
    if (!formData.resumeText.trim() && !formData.resumeFileId && !pendingUpload) {
      showToast('Résumé required — paste text or upload a file.', 'error')
      return
    }

    updateMutation.mutate({
      userId,
      locationId: formData.locationId,
      locationCity: formData.locationCity,
      locationState: formData.locationState,
      locationZip: formData.locationZip,
      resumeText: formData.resumeText,
      resumeFileId: formData.resumeFileId,
      resumeUpload: pendingUpload ?? undefined,
      workExperience: formData.workExperience,
      education: formData.education,
      certifications: formData.certifications,
      skills: formData.skills,
      causes: formData.causes,
      playInterests: formData.playInterests,
    })
  }

  const handleCancel = () => {
    if (profileData?.profile) {
      setFormData(profileToForm(profileData.profile))
    }
    setPendingUpload(null)
    setIsEditing(false)
  }

  const startEdit = () => {
    setIsEditing(true)
    requestAnimationFrame(() => {
      document.getElementById('profile-edit-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const handleParse = () => {
    if (!userId) return
    parseMutation.mutate({
      userId,
      resumeText: formData.resumeText || undefined,
      ...(pendingUpload ?? {}),
    })
  }

  const profileActions = (
    <>
      {isEditing ? (
        <>
          <button
            type="submit"
            form="end-user-profile-form"
            className="np-profile-btn np-profile-btn-primary"
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? 'Saving…' : 'Save changes'}
          </button>
          <button type="button" className="np-profile-btn" onClick={handleCancel}>
            Cancel
          </button>
        </>
      ) : (
        <button type="button" className="np-profile-btn np-profile-btn-primary" onClick={startEdit}>
          Edit profile
        </button>
      )}
    </>
  )

  if (isLoading || !userId) {
    return (
      <UserDashboardLayout pageTitle="My Profile" editorial>
        <div className="np-profile-shell">
          <Loading message="Composing your edition…" />
        </div>
      </UserDashboardLayout>
    )
  }

  const user = profileData?.profile
  if (!user) {
    return (
      <UserDashboardLayout pageTitle="My Profile" editorial>
        <div className="np-profile-shell">
          <p className="np-quiet">The desk couldn&apos;t load your edition—try a refresh.</p>
        </div>
      </UserDashboardLayout>
    )
  }

  const memberSince = new Date(user.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <UserDashboardLayout pageTitle="My Profile" editorial>
      <div className="np-profile-shell">
        <div className="np-profile-spread">
          <main className="np-profile-main">
            <section className="np-profile-section np-profile-section--summary" aria-labelledby="summary-heading">
              <h2 id="summary-heading" className="np-picks-header">
                My summary
              </h2>
              <p className="np-profile-manifesto np-profile-summary-lead">{summaryText}</p>
              <div className="np-profile-actions np-profile-actions--toolbar">{profileActions}</div>
            </section>

            {isEditing ? (
              <form
                id="end-user-profile-form"
                onSubmit={handleSubmit}
                className="np-profile-facts np-profile-facts--editing"
              >
                <p className="np-field-hint np-profile-facts-intro">
                  Place and résumé are required. Everything else helps your Daily feel like you.
                </p>

                <section id="profile-edit-form" className="np-profile-section" aria-labelledby="basics-heading">
                  <h2 id="basics-heading" className="np-picks-header np-picks-header-left">
                    Place
                  </h2>
                  <LocationAutocomplete
                    valueId={formData.locationId}
                    valueLabel={formData.locationLabel}
                    required
                    onChange={(loc) =>
                      setFormData((prev) => ({
                        ...prev,
                        locationId: loc?.id ?? '',
                        locationLabel: loc?.label ?? '',
                        locationCity: loc?.city ?? '',
                        locationState: loc?.state ?? '',
                        locationZip: loc?.zip ?? '',
                      }))
                    }
                  />
                </section>

                <section className="np-profile-section" aria-labelledby="work-heading">
                  <h2 id="work-heading" className="np-picks-header np-picks-header-left">
                    Work
                  </h2>
                  <ResumeSection
                    resumeText={formData.resumeText}
                    resumeFileName={pendingUpload?.fileName ?? formData.resumeFileName}
                    workExperience={formData.workExperience}
                    education={formData.education}
                    certifications={formData.certifications}
                    readOnly={false}
                    isParsing={parseMutation.isPending}
                    onResumeTextChange={(text) => setFormData((p) => ({ ...p, resumeText: text }))}
                    onFileSelect={(file) => {
                      setPendingUpload(file)
                      setFormData((p) => ({ ...p, resumeFileName: file.fileName }))
                    }}
                    onParse={handleParse}
                    onWorkChange={(workExperience) => setFormData((p) => ({ ...p, workExperience }))}
                    onEducationChange={(education) => setFormData((p) => ({ ...p, education }))}
                    onCertificationsChange={(certifications) =>
                      setFormData((p) => ({ ...p, certifications }))
                    }
                  />

                  <p className="np-label" style={{ marginTop: '1.25rem' }}>
                    Skills &amp; strengths
                  </p>
                  <div className="np-profile-actions np-profile-actions--inline">
                    <button
                      type="button"
                      className="np-profile-btn"
                      disabled={suggestSkillsQuery.isFetching}
                      onClick={() => void applySuggestedSkills()}
                    >
                      {suggestSkillsQuery.isFetching ? 'Matching…' : 'Match skills from résumé'}
                    </button>
                  </div>
                  <TaxonomySelect
                    idPrefix="skills"
                    categories={skillCategories}
                    value={formData.skills}
                    readOnly={false}
                    onChange={(skills) => setFormData((p) => ({ ...p, skills }))}
                  />
                </section>

                <section className="np-profile-section" aria-labelledby="volunteer-heading">
                  <h2 id="volunteer-heading" className="np-picks-header np-picks-header-left">
                    Volunteer
                  </h2>
                  <TaxonomySelect
                    idPrefix="causes"
                    categories={causeCategories}
                    value={formData.causes}
                    readOnly={false}
                    onChange={(causes) => setFormData((p) => ({ ...p, causes }))}
                  />
                </section>

                <section className="np-profile-section" aria-labelledby="play-heading">
                  <h2 id="play-heading" className="np-picks-header np-picks-header-left">
                    Play
                  </h2>
                  <TaxonomySelect
                    idPrefix="play"
                    categories={playCategories}
                    value={formData.playInterests}
                    readOnly={false}
                    onChange={(playInterests) => setFormData((p) => ({ ...p, playInterests }))}
                  />
                </section>

                <div className="np-profile-actions">{profileActions}</div>
              </form>
            ) : null}
          </main>

          <aside className="np-profile-rail" aria-label="Edition signals">
            <div className="np-rail-block">
              <p className="np-profile-meta-rail">
                {user.name?.toUpperCase() || 'MEMBER'}
                <br />
                {user.email?.toUpperCase()}
                <br />
                MEMBER SINCE {memberSince.toUpperCase()}
              </p>
            </div>

            <div className="np-rail-block np-profile-signals">
              <h2 className="np-picks-header">Signal strength</h2>
              <p className="np-signals-meta">
                PROFILE SIGNALS {signalStats.filled}/{signalStats.total} · {signalStats.percent}% COMPLETE
              </p>
              <div
                className="np-signals-track"
                role="progressbar"
                aria-valuenow={signalStats.percent}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div className="np-signals-fill" style={{ width: `${signalStats.percent}%` }} />
              </div>
              <p className="np-field-hint">
                Not a score—a read on how much we can responsibly infer for your Daily. Place and résumé
                required; the rest is seasoning.
              </p>
            </div>

            <div className="np-rail-block">
              <h2 className="np-picks-header">Your Daily (preview)</h2>
              <div className="np-preview-panel">
                {editionPreviewLines.map((line, i) => (
                  <p key={i} className="np-preview-line">
                    {line}
                  </p>
                ))}
              </div>
            </div>

            <div className="np-rail-block">
              <h2 className="np-picks-header">Next moves</h2>
              {nextMovesList.length > 0 ? (
                <ul className="np-next-list">
                  {nextMovesList.map((m) => (
                    <li key={m.id} className="np-next-item">
                      <p className="np-next-title">{m.title}</p>
                      <p className="np-next-detail">{m.detail}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="np-preview-line" style={{ marginTop: '0.35rem' }}>
                  The essentials are filed. Optional sections still fine-tune what shows up—and what
                  doesn&apos;t.
                </p>
              )}
            </div>
          </aside>
        </div>
      </div>
    </UserDashboardLayout>
  )
}
