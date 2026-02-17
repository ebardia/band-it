'use client'

import { useState, useEffect } from 'react'
import { Button, Text, Stack, Input, Textarea, FileUpload, useToast } from '@/components/ui'
import { trpc } from '@/lib/trpc'

interface BandDetailsSettingsProps {
  bandId: string
  bandSlug: string
  userId: string
  userRole?: string
  initialData: {
    name: string
    description: string
    mission: string
    values: string[]
    skillsLookingFor: string[]
    whatMembersWillLearn: string[]
    membershipRequirements: string
    zipcode: string | null
    imageUrl: string | null
  }
}

export function BandDetailsSettings({ bandId, bandSlug, userId, userRole, initialData }: BandDetailsSettingsProps) {
  const { showToast } = useToast()
  const utils = trpc.useUtils()
  const canEdit = userRole === 'FOUNDER' || userRole === 'GOVERNOR'

  const [formData, setFormData] = useState({
    name: initialData.name,
    description: initialData.description,
    mission: initialData.mission,
    values: initialData.values.join(', '),
    skillsLookingFor: initialData.skillsLookingFor.join(', '),
    whatMembersWillLearn: initialData.whatMembersWillLearn.join(', '),
    membershipRequirements: initialData.membershipRequirements,
    zipcode: initialData.zipcode || '',
    imageUrl: initialData.imageUrl || '',
  })

  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  const uploadFileMutation = trpc.file.upload.useMutation()
  const updateDetailsMutation = trpc.band.updateDetails.useMutation({
    onSuccess: () => {
      showToast('Band details updated successfully', 'success')
      setHasChanges(false)
      utils.band.getBySlug.invalidate({ slug: bandSlug })
    },
    onError: (error: any) => {
      showToast(error.message || 'Failed to update band details', 'error')
    },
  })

  useEffect(() => {
    const original = {
      name: initialData.name,
      description: initialData.description,
      mission: initialData.mission,
      values: initialData.values.join(', '),
      skillsLookingFor: initialData.skillsLookingFor.join(', '),
      whatMembersWillLearn: initialData.whatMembersWillLearn.join(', '),
      membershipRequirements: initialData.membershipRequirements,
      zipcode: initialData.zipcode || '',
      imageUrl: initialData.imageUrl || '',
    }
    const changed = Object.keys(formData).some(
      key => formData[key as keyof typeof formData] !== original[key as keyof typeof original]
    )
    setHasChanges(changed)
  }, [formData, initialData])

  const handleImageUpload = async (fileData: { fileName: string; mimeType: string; base64Data: string }) => {
    setIsUploadingImage(true)
    try {
      const result = await uploadFileMutation.mutateAsync({
        ...fileData,
        userId,
        category: 'IMAGE',
      })
      setFormData(prev => ({ ...prev, imageUrl: result.file.url }))
      showToast('Image uploaded - click Save Changes to update your band', 'success')
    } catch (error: any) {
      showToast(error.message || 'Failed to upload image', 'error')
    } finally {
      setIsUploadingImage(false)
    }
  }

  const removeImage = () => {
    setFormData(prev => ({ ...prev, imageUrl: '' }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const updateData: any = {
      bandId,
      userId,
    }

    if (formData.name !== initialData.name) {
      updateData.name = formData.name
    }
    if (formData.description !== initialData.description) {
      updateData.description = formData.description
    }
    if (formData.mission !== initialData.mission) {
      updateData.mission = formData.mission
    }
    if (formData.values !== initialData.values.join(', ')) {
      updateData.values = formData.values
    }
    if (formData.skillsLookingFor !== initialData.skillsLookingFor.join(', ')) {
      updateData.skillsLookingFor = formData.skillsLookingFor
    }
    if (formData.whatMembersWillLearn !== initialData.whatMembersWillLearn.join(', ')) {
      updateData.whatMembersWillLearn = formData.whatMembersWillLearn
    }
    if (formData.membershipRequirements !== initialData.membershipRequirements) {
      updateData.membershipRequirements = formData.membershipRequirements
    }
    if (formData.zipcode !== (initialData.zipcode || '')) {
      updateData.zipcode = formData.zipcode
    }
    if (formData.imageUrl !== (initialData.imageUrl || '')) {
      updateData.imageUrl = formData.imageUrl || null
    }

    updateDetailsMutation.mutate(updateData)
  }

  if (!canEdit) {
    return (
      <div className="border border-gray-200 rounded-lg bg-white p-3">
        <div className="flex items-center justify-between mb-2">
          <Text weight="semibold">Band Details</Text>
          <Text variant="small" color="muted">View only</Text>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex gap-2"><span className="text-gray-500 w-24 shrink-0">Name:</span><span>{initialData.name}</span></div>
          <div className="flex gap-2"><span className="text-gray-500 w-24 shrink-0">Description:</span><span className="line-clamp-2">{initialData.description}</span></div>
          <div className="flex gap-2"><span className="text-gray-500 w-24 shrink-0">Mission:</span><span className="line-clamp-2">{initialData.mission}</span></div>
          {initialData.values.length > 0 && <div className="flex gap-2"><span className="text-gray-500 w-24 shrink-0">Values:</span><span>{initialData.values.join(', ')}</span></div>}
          {initialData.skillsLookingFor.length > 0 && <div className="flex gap-2"><span className="text-gray-500 w-24 shrink-0">Skills:</span><span>{initialData.skillsLookingFor.join(', ')}</span></div>}
          {initialData.zipcode && <div className="flex gap-2"><span className="text-gray-500 w-24 shrink-0">Zipcode:</span><span>{initialData.zipcode}</span></div>}
        </div>
      </div>
    )
  }

  return (
    <div className="border border-gray-200 rounded-lg bg-white p-3">
      <form onSubmit={handleSubmit}>
        <Stack spacing="md">
          <Text weight="semibold">Band Details</Text>

          <Input
            label="Band Name"
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="The Rockin' Rebels"
          />

          <Textarea
            label="Description"
            required
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Tell people about your band..."
            rows={6}
          />

          <Textarea
            label="Mission Statement"
            required
            value={formData.mission}
            onChange={(e) => setFormData({ ...formData, mission: e.target.value })}
            placeholder="Our mission is to..."
            rows={4}
          />

          <Textarea
            label="Band Values"
            required
            value={formData.values}
            onChange={(e) => setFormData({ ...formData, values: e.target.value })}
            placeholder="Creativity, Collaboration, Community"
            rows={3}
            helperText="Comma-separated"
          />

          <Textarea
            label="Skills We're Looking For"
            required
            value={formData.skillsLookingFor}
            onChange={(e) => setFormData({ ...formData, skillsLookingFor: e.target.value })}
            placeholder="Guitar, Drums, Vocals, Marketing"
            rows={1}
            helperText="Comma-separated"
          />

          <Textarea
            label="What Members Will Learn"
            required
            value={formData.whatMembersWillLearn}
            onChange={(e) => setFormData({ ...formData, whatMembersWillLearn: e.target.value })}
            placeholder="Performance skills, Music theory"
            rows={1}
            helperText="Comma-separated"
          />

          <Textarea
            label="Membership Requirements"
            required
            value={formData.membershipRequirements}
            onChange={(e) => setFormData({ ...formData, membershipRequirements: e.target.value })}
            placeholder="We're looking for committed musicians..."
            rows={2}
          />

          <Input
            label="Postal Code"
            type="text"
            value={formData.zipcode}
            onChange={(e) => setFormData({ ...formData, zipcode: e.target.value })}
            placeholder="e.g. 12345"
            maxLength={10}
          />

          <div>
            <Text variant="small" weight="semibold" className="mb-1">Band Image</Text>
            {formData.imageUrl ? (
              <div className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                <img src={formData.imageUrl} alt="Band" className="w-12 h-12 object-cover rounded" />
                <div className="flex-1 text-sm">
                  {formData.imageUrl !== (initialData.imageUrl || '') && (
                    <span className="text-amber-600">Unsaved</span>
                  )}
                </div>
                <Button type="button" variant="danger" size="sm" onClick={removeImage}>Remove</Button>
              </div>
            ) : (
              <FileUpload
                onUpload={handleImageUpload}
                isUploading={isUploadingImage}
                label=""
                description="Upload band image"
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
              disabled={updateDetailsMutation.isPending || !hasChanges}
            >
              {updateDetailsMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </Stack>
      </form>
    </div>
  )
}
