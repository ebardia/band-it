'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { jwtDecode } from 'jwt-decode'
import { trpc } from '@/lib/trpc'
import { AGENCY_PRODUCTS } from '@band-it/shared'
import { useToast, Loading } from '@/components/ui'
import { EditorialSurface } from '@/components/editorial/EditorialSurface'
import { CatBotMastheadTitle } from '@/components/landing/CatBotMastheadTitle'
import {
  EditorialAddressFields,
  EditorialChecklist,
  EditorialError,
  EditorialFieldGroup,
  EditorialHint,
  EditorialInput,
  EditorialLabel,
  EditorialLogoUpload,
  EditorialSocialFields,
  EditorialTextarea,
} from '@/components/band-profile/EditorialFormFields'

function formatPaperDate(d: Date) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(d)
}

const emptyAddress = {
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  zipcode: '',
  country: 'US',
}

const emptySocial = {
  websiteUrl: '',
  facebookUrl: '',
  instagramUrl: '',
  xUrl: '',
  tiktokUrl: '',
  youtubeUrl: '',
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1] ?? '')
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [uploadedLogoName, setUploadedLogoName] = useState<string | null>(null)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)

  const [form, setForm] = useState({
    name: '',
    mission: '',
    productsOffered: [] as string[],
    productsOther: '',
    clientSearchRadiusMiles: 50,
    logoUrl: '',
    ...emptyAddress,
    ...emptySocial,
  })

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      try {
        const decoded = jwtDecode<{ userId: string }>(token)
        setUserId(decoded.userId)
      } catch {
        router.push('/login')
      }
    } else {
      router.push('/login')
    }
  }, [router])

  const { data: profileData, isLoading: profileLoading } = trpc.auth.getProfile.useQuery(
    { userId: userId! },
    { enabled: !!userId },
  )

  const { data: searchResults, isLoading: searchLoading } = trpc.admin.searchUsersForFounder.useQuery(
    { adminUserId: userId!, search: founderSearch },
    {
      enabled: !!userId && profileData?.user?.isAdmin && founderSearch.length >= 2,
    },
  )

  const uploadFileMutation = trpc.file.upload.useMutation()
  const createBigBandMutation = trpc.admin.createBigBand.useMutation({
    onSuccess: () => {
      showToast('Agency created successfully!', 'success')
      router.push('/admin/bands')
    },
    onError: (error) => {
      showToast(error.message || 'Failed to create agency', 'error')
    },
  })

  const setAddress = (field: keyof typeof emptyAddress, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setFieldErrors((prev) => {
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  const setSocial = (field: keyof typeof emptySocial, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleLogoUpload = async (file: File) => {
    if (!userId) return
    setIsUploadingLogo(true)
    try {
      const base64Data = await fileToBase64(file)
      const result = await uploadFileMutation.mutateAsync({
        fileName: file.name,
        mimeType: file.type,
        base64Data,
        userId,
        category: 'IMAGE',
      })
      setForm((prev) => ({ ...prev, logoUrl: result.file.url }))
      setUploadedLogoName(result.file.originalName)
      showToast('Logo uploaded', 'success')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to upload logo'
      showToast(message, 'error')
    } finally {
      setIsUploadingLogo(false)
    }
  }

  const validate = () => {
    const errors: Record<string, string> = {}
    if (!selectedFounder) errors.founder = 'Select a founder'
    if (form.name.trim().length < 2) errors.name = 'Agency name must be at least 2 characters'
    if (form.mission.trim().length < 10) errors.mission = 'Mission must be at least 10 characters'
    if (form.productsOffered.length === 0) errors.productsOffered = 'Select at least one product'
    if (form.productsOffered.includes('OTHER') && !form.productsOther.trim()) {
      errors.productsOther = 'Describe other products'
    }
    if (!form.addressLine1.trim()) errors.addressLine1 = 'Street address is required'
    if (!form.city.trim()) errors.city = 'City is required'
    if (!form.state.trim()) errors.state = 'State is required'
    if (form.zipcode.trim().length < 3) errors.zipcode = 'ZIP code is required'
    return errors
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId || !selectedFounder) {
      showToast('Please select a founder', 'error')
      return
    }

    const errors = validate()
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      showToast(Object.values(errors)[0], 'error')
      return
    }
    setFieldErrors({})

    createBigBandMutation.mutate({
      adminUserId: userId,
      founderId: selectedFounder.id,
      name: form.name.trim(),
      mission: form.mission.trim(),
      productsOffered: form.productsOffered as (
        | 'HIGHLEVEL_CRM'
        | 'CRM_SETUP'
        | 'PIPELINE_AUTOMATION'
        | 'WEBSITE_FUNNEL'
        | 'REPUTATION'
        | 'SMS_EMAIL'
        | 'CATBOT_TRAINING'
        | 'OTHER'
      )[],
      productsOther: form.productsOther.trim() || undefined,
      clientSearchRadiusMiles: form.clientSearchRadiusMiles,
      logoUrl: form.logoUrl || undefined,
      addressLine1: form.addressLine1.trim(),
      addressLine2: form.addressLine2.trim() || undefined,
      city: form.city.trim(),
      state: form.state.trim(),
      zipcode: form.zipcode.trim(),
      country: form.country.trim() || 'US',
      websiteUrl: form.websiteUrl.trim() || undefined,
      facebookUrl: form.facebookUrl.trim() || undefined,
      instagramUrl: form.instagramUrl.trim() || undefined,
      xUrl: form.xUrl.trim() || undefined,
      tiktokUrl: form.tiktokUrl.trim() || undefined,
      youtubeUrl: form.youtubeUrl.trim() || undefined,
    })
  }

  if (profileLoading) {
    return (
      <EditorialSurface>
        <div className="np-shell">
          <Loading message="Checking permissions…" />
        </div>
      </EditorialSurface>
    )
  }

  if (!profileData?.user?.isAdmin) {
    return (
      <EditorialSurface>
        <div className="np-shell np-profile-form-shell">
          <p className="np-quiet">You do not have permission to access this page.</p>
          <Link href="/" className="np-action">
            ← Home
          </Link>
        </div>
      </EditorialSurface>
    )
  }

  return (
    <EditorialSurface>
      <div className="np-shell np-landing-page np-profile-form-shell">
        <header className="np-landing-masthead np-register-masthead">
          <CatBotMastheadTitle />
          <p className="np-register-tagline">
            Create a reseller agency and assign its founder.
          </p>
          <hr className="np-rule" />
          <div className="np-masthead-meta py-3 md:py-3.5">
            <span suppressHydrationWarning>{formatPaperDate(new Date())}</span>
            <span className="text-right">Admin Edition</span>
          </div>
        </header>

        <form onSubmit={handleSubmit}>
          <EditorialFieldGroup kicker="Founder" title="Assign agency founder">
            {selectedFounder ? (
              <div className="np-register-alert">
                <p className="np-excerpt">
                  <strong>{selectedFounder.name}</strong> — {selectedFounder.email}
                </p>
                <button
                  type="button"
                  className="np-action np-action-left"
                  onClick={() => setSelectedFounder(null)}
                >
                  Change founder →
                </button>
              </div>
            ) : (
              <>
                <div>
                  <EditorialLabel htmlFor="founder-search">Search users</EditorialLabel>
                  <EditorialInput
                    id="founder-search"
                    type="search"
                    value={founderSearch}
                    onChange={(e) => setFounderSearch(e.target.value)}
                    placeholder="Name or email…"
                  />
                  <EditorialHint>Type at least 2 characters</EditorialHint>
                </div>
                {searchLoading ? <p className="np-quiet">Searching…</p> : null}
                {searchResults?.users && searchResults.users.length > 0 ? (
                  <ul className="np-fineprint-list">
                    {searchResults.users.map((user) => (
                      <li key={user.id} className="np-fineprint-item">
                        <button
                          type="button"
                          className="np-action np-action-left"
                          onClick={() => {
                            setSelectedFounder(user)
                            setFounderSearch('')
                          }}
                        >
                          {user.name} — {user.email} →
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {founderSearch.length >= 2 && !searchLoading && searchResults?.users?.length === 0 ? (
                  <p className="np-quiet">No users found</p>
                ) : null}
              </>
            )}
            <EditorialError message={fieldErrors.founder} />
          </EditorialFieldGroup>

          <EditorialFieldGroup kicker="Agency" title="Agency name & mission">
            <div>
              <EditorialLabel htmlFor="agency-name">Agency name</EditorialLabel>
              <EditorialInput
                id="agency-name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Work Smarter Digital"
                error={fieldErrors.name}
              />
            </div>
            <div>
              <EditorialLabel htmlFor="agency-mission">Mission statement</EditorialLabel>
              <EditorialTextarea
                id="agency-mission"
                required
                rows={3}
                value={form.mission}
                onChange={(e) => setForm({ ...form, mission: e.target.value })}
                placeholder="What this agency helps clients achieve…"
                error={fieldErrors.mission}
              />
            </div>
          </EditorialFieldGroup>

          <EditorialFieldGroup kicker="Offerings" title="Products they offer">
            <EditorialChecklist
              options={AGENCY_PRODUCTS}
              selected={form.productsOffered}
              onChange={(productsOffered) => setForm({ ...form, productsOffered })}
              otherValue={form.productsOther}
              onOtherChange={(productsOther) => setForm({ ...form, productsOther })}
              otherLabel="Describe other products"
            />
            <EditorialError message={fieldErrors.productsOffered} />
          </EditorialFieldGroup>

          <EditorialFieldGroup kicker="Territory" title="Address & client radius">
            <EditorialAddressFields values={form} onChange={setAddress} errors={fieldErrors} />
            <div>
              <EditorialLabel htmlFor="client-radius">
                Client search radius (miles from address)
              </EditorialLabel>
              <EditorialInput
                id="client-radius"
                type="number"
                min={1}
                max={500}
                required
                value={form.clientSearchRadiusMiles}
                onChange={(e) =>
                  setForm({
                    ...form,
                    clientSearchRadiusMiles: parseInt(e.target.value, 10) || 1,
                  })
                }
              />
              <EditorialHint>How far out this agency looks for client businesses</EditorialHint>
            </div>
          </EditorialFieldGroup>

          <EditorialFieldGroup kicker="Presence" title="Logo & links">
            <div>
              <EditorialLabel>Logo</EditorialLabel>
              <EditorialLogoUpload
                logoUrl={form.logoUrl}
                uploadedName={uploadedLogoName}
                isUploading={isUploadingLogo}
                onUpload={handleLogoUpload}
                onRemove={() => {
                  setForm((prev) => ({ ...prev, logoUrl: '' }))
                  setUploadedLogoName(null)
                }}
              />
            </div>
            <EditorialSocialFields values={form} onChange={setSocial} />
          </EditorialFieldGroup>

          <div className="np-profile-form-actions">
            <button
              type="submit"
              className="np-profile-btn np-profile-btn-primary"
              disabled={!selectedFounder || createBigBandMutation.isPending}
            >
              {createBigBandMutation.isPending ? 'Creating…' : 'Create agency'}
            </button>
            <p className="np-field-hint" style={{ marginTop: '1rem' }}>
              <Link href="/admin/bands" className="np-action">
                ← Back to admin bands
              </Link>
            </p>
          </div>
        </form>
      </div>
    </EditorialSurface>
  )
}
