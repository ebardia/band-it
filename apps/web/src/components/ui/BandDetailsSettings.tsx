'use client'

import { useState, useEffect } from 'react'
import { Button, Text, Stack, Input, Textarea, FileUpload, useToast } from '@/components/ui'
import { trpc } from '@/lib/trpc'
import { BUSINESS_TYPES, MEDICAL_SPA_SERVICES, AGENCY_PRODUCTS } from '@band-it/shared'

interface BandDetailsSettingsProps {
  bandId: string
  bandSlug: string
  userId: string
  userRole?: string
  isBigBand?: boolean
  initialData: {
    name: string
    description: string
    mission: string
    values: string[]
    businessType: string | null
    servicesOffered: string[]
    servicesOther: string | null
    productsOffered: string[]
    productsOther: string | null
    serviceAreaMiles: number | null
    clientSearchRadiusMiles: number | null
    addressLine1: string | null
    addressLine2: string | null
    city: string | null
    state: string | null
    zipcode: string | null
    country: string | null
    websiteUrl: string | null
    facebookUrl: string | null
    instagramUrl: string | null
    xUrl: string | null
    tiktokUrl: string | null
    youtubeUrl: string | null
    imageUrl: string | null
  }
}

export function BandDetailsSettings({
  bandId,
  bandSlug,
  userId,
  userRole,
  isBigBand = false,
  initialData,
}: BandDetailsSettingsProps) {
  const { showToast } = useToast()
  const utils = trpc.useUtils()
  const canEdit = userRole === 'FOUNDER' || userRole === 'GOVERNOR'

  const [formData, setFormData] = useState({
    name: initialData.name,
    description: initialData.description,
    mission: initialData.mission,
    values: initialData.values.join(', '),
    businessType: initialData.businessType || 'MEDICAL_SPA',
    servicesOffered: initialData.servicesOffered || [],
    servicesOther: initialData.servicesOther || '',
    productsOffered: initialData.productsOffered || [],
    productsOther: initialData.productsOther || '',
    serviceAreaMiles: initialData.serviceAreaMiles ?? 25,
    clientSearchRadiusMiles: initialData.clientSearchRadiusMiles ?? 50,
    addressLine1: initialData.addressLine1 || '',
    addressLine2: initialData.addressLine2 || '',
    city: initialData.city || '',
    state: initialData.state || '',
    zipcode: initialData.zipcode || '',
    country: initialData.country || 'US',
    websiteUrl: initialData.websiteUrl || '',
    facebookUrl: initialData.facebookUrl || '',
    instagramUrl: initialData.instagramUrl || '',
    xUrl: initialData.xUrl || '',
    tiktokUrl: initialData.tiktokUrl || '',
    youtubeUrl: initialData.youtubeUrl || '',
    logoUrl: initialData.imageUrl || '',
  })

  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  const uploadFileMutation = trpc.file.upload.useMutation()
  const updateDetailsMutation = trpc.band.updateDetails.useMutation({
    onSuccess: () => {
      showToast('Profile updated successfully', 'success')
      setHasChanges(false)
      utils.band.getBySlug.invalidate({ slug: bandSlug })
    },
    onError: (error: { message?: string }) => {
      showToast(error.message || 'Failed to update profile', 'error')
    },
  })

  const updateAgencyMutation = trpc.band.updateAgencyProfile.useMutation({
    onSuccess: () => {
      showToast('Agency profile updated successfully', 'success')
      setHasChanges(false)
      utils.band.getBySlug.invalidate({ slug: bandSlug })
    },
    onError: (error: { message?: string }) => {
      showToast(error.message || 'Failed to update agency profile', 'error')
    },
  })

  useEffect(() => {
    setHasChanges(true)
  }, [formData])

  useEffect(() => {
    setHasChanges(false)
  }, [initialData])

  const handleImageUpload = async (fileData: { fileName: string; mimeType: string; base64Data: string }) => {
    setIsUploadingImage(true)
    try {
      const result = await uploadFileMutation.mutateAsync({
        ...fileData,
        userId,
        category: 'IMAGE',
      })
      setFormData((prev) => ({ ...prev, logoUrl: result.file.url }))
      showToast('Logo uploaded — click Save Changes to apply', 'success')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to upload logo'
      showToast(message, 'error')
    } finally {
      setIsUploadingImage(false)
    }
  }

  const toggleChecklist = (field: 'servicesOffered' | 'productsOffered', id: string) => {
    setFormData((prev) => {
      const list = prev[field]
      return {
        ...prev,
        [field]: list.includes(id) ? list.filter((s) => s !== id) : [...list, id],
      }
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (isBigBand) {
      updateAgencyMutation.mutate({
        bandId,
        userId,
        name: formData.name,
        mission: formData.mission,
        productsOffered: formData.productsOffered as (
          | 'HIGHLEVEL_CRM'
          | 'CRM_SETUP'
          | 'PIPELINE_AUTOMATION'
          | 'WEBSITE_FUNNEL'
          | 'REPUTATION'
          | 'SMS_EMAIL'
          | 'CATBOT_TRAINING'
          | 'OTHER'
        )[],
        productsOther: formData.productsOther || undefined,
        clientSearchRadiusMiles: formData.clientSearchRadiusMiles,
        addressLine1: formData.addressLine1,
        addressLine2: formData.addressLine2 || undefined,
        city: formData.city,
        state: formData.state,
        zipcode: formData.zipcode,
        country: formData.country,
        logoUrl: formData.logoUrl || null,
        websiteUrl: formData.websiteUrl || null,
        facebookUrl: formData.facebookUrl || null,
        instagramUrl: formData.instagramUrl || null,
        xUrl: formData.xUrl || null,
        tiktokUrl: formData.tiktokUrl || null,
        youtubeUrl: formData.youtubeUrl || null,
      })
      return
    }

    updateDetailsMutation.mutate({
      bandId,
      userId,
      name: formData.name,
      businessType: formData.businessType as 'MEDICAL_SPA',
      description: formData.description,
      mission: formData.mission,
      values: formData.values,
      servicesOffered: formData.servicesOffered as (
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
      servicesOther: formData.servicesOther || undefined,
      serviceAreaMiles: formData.serviceAreaMiles,
      addressLine1: formData.addressLine1,
      addressLine2: formData.addressLine2 || undefined,
      city: formData.city,
      state: formData.state,
      zipcode: formData.zipcode,
      country: formData.country,
      logoUrl: formData.logoUrl || null,
      websiteUrl: formData.websiteUrl || null,
      facebookUrl: formData.facebookUrl || null,
      instagramUrl: formData.instagramUrl || null,
      xUrl: formData.xUrl || null,
      tiktokUrl: formData.tiktokUrl || null,
      youtubeUrl: formData.youtubeUrl || null,
    })
  }

  const title = isBigBand ? 'Agency Profile' : 'Business Profile'
  const nameLabel = isBigBand ? 'Agency name' : 'Business name'

  if (!canEdit) {
    return (
      <div className="border border-gray-200 rounded-lg bg-white p-3">
        <Text weight="semibold">{title}</Text>
        <Text variant="small" color="muted" className="mt-1">View only</Text>
        <div className="space-y-2 text-sm mt-3">
          <div><span className="text-gray-500">Name:</span> {initialData.name}</div>
          {!isBigBand && initialData.description && (
            <div><span className="text-gray-500">Description:</span> {initialData.description}</div>
          )}
          <div><span className="text-gray-500">Mission:</span> {initialData.mission}</div>
        </div>
      </div>
    )
  }

  const checklistOptions = isBigBand ? AGENCY_PRODUCTS : MEDICAL_SPA_SERVICES
  const checklistField = isBigBand ? 'productsOffered' : 'servicesOffered'
  const checklistSelected = isBigBand ? formData.productsOffered : formData.servicesOffered
  const otherField = isBigBand ? 'productsOther' : 'servicesOther'
  const otherValue = isBigBand ? formData.productsOther : formData.servicesOther

  return (
    <div className="border border-gray-200 rounded-lg bg-white p-3">
      <form onSubmit={handleSubmit}>
        <Stack spacing="md">
          <Text weight="semibold">{title}</Text>

          <Input
            label={nameLabel}
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          {!isBigBand && (
            <>
              <div>
                <Text variant="small" weight="semibold" className="mb-1">Business type</Text>
                <select
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  value={formData.businessType}
                  onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                >
                  {BUSINESS_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </div>
              <Textarea
                label="Description"
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
              />
            </>
          )}

          <Textarea
            label="Mission statement"
            required
            value={formData.mission}
            onChange={(e) => setFormData({ ...formData, mission: e.target.value })}
            rows={3}
          />

          {!isBigBand && (
            <Textarea
              label="Values"
              required
              value={formData.values}
              onChange={(e) => setFormData({ ...formData, values: e.target.value })}
              rows={2}
              helperText="Comma-separated"
            />
          )}

          <div>
            <Text variant="small" weight="semibold" className="mb-2">
              {isBigBand ? 'Products offered' : 'Services offered'}
            </Text>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {checklistOptions.map((option) => (
                <label key={option.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={checklistSelected.includes(option.id)}
                    onChange={() => toggleChecklist(checklistField, option.id)}
                  />
                  {option.label}
                </label>
              ))}
            </div>
            {checklistSelected.includes('OTHER') && (
              <Input
                label="Other"
                type="text"
                value={otherValue}
                onChange={(e) => setFormData({ ...formData, [otherField]: e.target.value })}
                className="mt-2"
              />
            )}
          </div>

          <Input label="Street address" required value={formData.addressLine1} onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })} />
          <Input label="Suite / unit" value={formData.addressLine2} onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="City" required value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
            <Input label="State" required value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="ZIP" required value={formData.zipcode} onChange={(e) => setFormData({ ...formData, zipcode: e.target.value })} maxLength={10} />
            <Input label="Country" value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })} />
          </div>

          <Input
            label={isBigBand ? 'Client search radius (miles)' : 'Service area (miles)'}
            type="number"
            min={1}
            max={500}
            value={isBigBand ? formData.clientSearchRadiusMiles : formData.serviceAreaMiles}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10) || 1
              setFormData(
                isBigBand
                  ? { ...formData, clientSearchRadiusMiles: n }
                  : { ...formData, serviceAreaMiles: n },
              )
            }}
          />

          <Input label="Website URL" type="url" value={formData.websiteUrl} onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })} />
          <Input label="Facebook" type="url" value={formData.facebookUrl} onChange={(e) => setFormData({ ...formData, facebookUrl: e.target.value })} />
          <Input label="Instagram" type="url" value={formData.instagramUrl} onChange={(e) => setFormData({ ...formData, instagramUrl: e.target.value })} />
          <Input label="X" type="url" value={formData.xUrl} onChange={(e) => setFormData({ ...formData, xUrl: e.target.value })} />
          <Input label="TikTok" type="url" value={formData.tiktokUrl} onChange={(e) => setFormData({ ...formData, tiktokUrl: e.target.value })} />
          <Input label="YouTube" type="url" value={formData.youtubeUrl} onChange={(e) => setFormData({ ...formData, youtubeUrl: e.target.value })} />

          <div>
            <Text variant="small" weight="semibold" className="mb-1">Logo</Text>
            {formData.logoUrl ? (
              <div className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                <img src={formData.logoUrl} alt="Logo" className="w-12 h-12 object-contain rounded" />
                <Button type="button" variant="danger" size="sm" onClick={() => setFormData({ ...formData, logoUrl: '' })}>
                  Remove
                </Button>
              </div>
            ) : (
              <FileUpload
                onUpload={handleImageUpload}
                isUploading={isUploadingImage}
                label=""
                description="Upload logo"
                accept="image/jpeg,image/png,image/gif,image/webp"
                maxSizeMB={5}
              />
            )}
          </div>

          <div className="flex justify-end pt-2 border-t">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={updateDetailsMutation.isPending || updateAgencyMutation.isPending || !hasChanges}
            >
              {updateDetailsMutation.isPending || updateAgencyMutation.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </Stack>
      </form>
    </div>
  )
}
