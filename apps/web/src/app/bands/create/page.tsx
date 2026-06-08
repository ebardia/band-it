'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { jwtDecode } from 'jwt-decode'
import { trpc } from '@/lib/trpc'
import { useToast } from '@/components/ui'
import { BUSINESS_TYPES, MEDICAL_SPA_SERVICES } from '@band-it/shared'
import { EditorialSurface } from '@/components/editorial/EditorialSurface'
import { EditorialNeonMasthead } from '@/components/newspaper/EditorialNeonMasthead'
import {
  EditorialAddressFields,
  EditorialChecklist,
  EditorialFieldGroup,
  EditorialHint,
  EditorialInput,
  EditorialLabel,
  EditorialLogoUpload,
  EditorialSocialFields,
  EditorialTextarea,
  EditorialError,
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

function CreateBusinessBandContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { showToast } = useToast()
  const parentBandId = searchParams.get('parentBandId')
  const parentBandName = searchParams.get('parentBandName')

  const [userId, setUserId] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [uploadedLogoName, setUploadedLogoName] = useState<string | null>(null)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)

  const [form, setForm] = useState({
    name: '',
    businessType: 'MEDICAL_SPA',
    description: '',
    mission: '',
    values: '',
    servicesOffered: [] as string[],
    servicesOther: '',
    serviceAreaMiles: 25,
    logoUrl: '',
    ...emptyAddress,
    ...emptySocial,
  })

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      router.replace('/login')
      return
    }
    try {
      const decoded = jwtDecode<{ userId: string }>(token)
      setUserId(decoded.userId)
    } catch {
      router.replace('/login')
    }
  }, [router])

  const uploadFileMutation = trpc.file.upload.useMutation()
  const createBandMutation = trpc.band.create.useMutation({
    onSuccess: () => {
      showToast('Business profile created!', 'success')
      router.push('/bands/my-bands')
    },
    onError: (error) => {
      showToast(error.message || 'Could not create business', 'error')
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
    if (form.name.trim().length < 2) errors.name = 'Business name must be at least 2 characters'
    if (form.description.trim().length < 10) errors.description = 'Description must be at least 10 characters'
    if (form.mission.trim().length < 10) errors.mission = 'Mission must be at least 10 characters'
    if (!form.values.trim()) errors.values = 'Enter at least one value'
    if (form.servicesOffered.length === 0) errors.servicesOffered = 'Select at least one service'
    if (form.servicesOffered.includes('OTHER') && !form.servicesOther.trim()) {
      errors.servicesOther = 'Describe other services'
    }
    if (!form.addressLine1.trim()) errors.addressLine1 = 'Street address is required'
    if (!form.city.trim()) errors.city = 'City is required'
    if (!form.state.trim()) errors.state = 'State is required'
    if (form.zipcode.trim().length < 3) errors.zipcode = 'ZIP code is required'
    if (form.serviceAreaMiles < 1) errors.serviceAreaMiles = 'Service area must be at least 1 mile'
    return errors
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return

    const errors = validate()
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      showToast(Object.values(errors)[0], 'error')
      return
    }
    setFieldErrors({})

    createBandMutation.mutate({
      userId,
      name: form.name.trim(),
      businessType: form.businessType as 'MEDICAL_SPA',
      description: form.description.trim(),
      mission: form.mission.trim(),
      values: form.values.trim(),
      servicesOffered: form.servicesOffered as (
        | 'BOTOX'
        | 'FILLERS'
        | 'LASER_HAIR'
        | 'LASER_SKIN'
        | 'CHEMICAL_PEEL'
        | 'MICRONEEDLING'
        | 'BODY_CONTOURING'
        | 'IV_THERAPY'
        | 'SKIN_REJUVENATION'
        | 'MEDICAL_FACIAL'
        | 'OTHER'
      )[],
      servicesOther: form.servicesOther.trim() || undefined,
      serviceAreaMiles: form.serviceAreaMiles,
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
      parentBandId: parentBandId || undefined,
    })
  }

  return (
    <EditorialSurface>
      <div className="np-shell np-landing-page np-profile-form-shell">
        <header className="np-landing-masthead np-register-masthead">
          <p className="np-cat">Adopt A Cat Bot</p>
          <EditorialNeonMasthead
            arcLabel={parentBandId ? 'Client' : 'New'}
            actionLabel="Business"
            ariaLabel={parentBandId ? 'New Client Business' : 'New Business'}
          />
          <p className="np-register-tagline">
            {parentBandId
              ? `Register a client business under ${parentBandName || 'your agency'}.`
              : 'Tell us about your business so your Cat Bots know who they speak for.'}
          </p>
          <hr className="np-rule" />
          <div className="np-masthead-meta py-3 md:py-3.5">
            <span suppressHydrationWarning>{formatPaperDate(new Date())}</span>
            <span className="text-right">Business Edition</span>
          </div>
        </header>

        <form onSubmit={handleSubmit}>
          <EditorialFieldGroup kicker="Identity" title="Business name & type">
            <div>
              <EditorialLabel htmlFor="business-name">Business name</EditorialLabel>
              <EditorialInput
                id="business-name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Potomac Skin Care"
                error={fieldErrors.name}
              />
            </div>
            <div>
              <EditorialLabel htmlFor="business-type">Business type</EditorialLabel>
              <select
                id="business-type"
                className="np-field"
                value={form.businessType}
                onChange={(e) => setForm({ ...form, businessType: e.target.value })}
              >
                {BUSINESS_TYPES.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </EditorialFieldGroup>

          <EditorialFieldGroup kicker="Story" title="Description & mission">
            <div>
              <EditorialLabel htmlFor="business-description">Description</EditorialLabel>
              <EditorialTextarea
                id="business-description"
                required
                rows={4}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Who you are and what makes your practice distinct…"
                error={fieldErrors.description}
              />
            </div>
            <div>
              <EditorialLabel htmlFor="business-mission">Mission statement</EditorialLabel>
              <EditorialTextarea
                id="business-mission"
                required
                rows={3}
                value={form.mission}
                onChange={(e) => setForm({ ...form, mission: e.target.value })}
                placeholder="What you are trying to achieve for your clients…"
                error={fieldErrors.mission}
              />
            </div>
            <div>
              <EditorialLabel htmlFor="business-values">Values</EditorialLabel>
              <EditorialTextarea
                id="business-values"
                required
                rows={2}
                value={form.values}
                onChange={(e) => setForm({ ...form, values: e.target.value })}
                placeholder="Warmth, precision, discretion"
                error={fieldErrors.values}
              />
              <EditorialHint>Separate with commas</EditorialHint>
            </div>
          </EditorialFieldGroup>

          <EditorialFieldGroup kicker="Services" title="Services offered">
            <EditorialChecklist
              options={MEDICAL_SPA_SERVICES}
              selected={form.servicesOffered}
              onChange={(servicesOffered) => setForm({ ...form, servicesOffered })}
              otherValue={form.servicesOther}
              onOtherChange={(servicesOther) => setForm({ ...form, servicesOther })}
            />
            <EditorialError message={fieldErrors.servicesOffered} />
          </EditorialFieldGroup>

          <EditorialFieldGroup kicker="Location" title="Address & service area">
            <EditorialAddressFields values={form} onChange={setAddress} errors={fieldErrors} />
            <div>
              <EditorialLabel htmlFor="service-area">Service area (miles from address)</EditorialLabel>
              <EditorialInput
                id="service-area"
                type="number"
                min={1}
                max={500}
                required
                value={form.serviceAreaMiles}
                onChange={(e) =>
                  setForm({ ...form, serviceAreaMiles: parseInt(e.target.value, 10) || 1 })
                }
                error={fieldErrors.serviceAreaMiles}
              />
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
              disabled={createBandMutation.isPending}
            >
              {createBandMutation.isPending ? 'Creating…' : 'Create business'}
            </button>
            <p className="np-field-hint" style={{ marginTop: '1rem' }}>
              <Link href="/bands/my-bands" className="np-action">
                ← Back to my bands
              </Link>
            </p>
          </div>
        </form>
      </div>
    </EditorialSurface>
  )
}

export default function CreateBandPage() {
  return (
    <Suspense
      fallback={
        <EditorialSurface>
          <div className="np-shell">
            <p className="np-quiet">Loading…</p>
          </div>
        </EditorialSurface>
      }
    >
      <CreateBusinessBandContent />
    </Suspense>
  )
}
