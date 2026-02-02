'use client'

import { useState, useEffect } from 'react'
import { Button, Text, Heading, Stack, Card, Input, Textarea, Box, FileUpload, useToast } from '@/components/ui'
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
      showToast('Image uploaded', 'success')
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
      <Card>
        <Stack spacing="lg">
          <Heading level={3}>Band Details</Heading>
          <Text variant="muted">Only founders and governors can edit band details.</Text>

          <div className="grid gap-4">
            <div>
              <Text variant="small" weight="semibold" className="text-gray-500">Band Name</Text>
              <Text>{initialData.name}</Text>
            </div>
            <div>
              <Text variant="small" weight="semibold" className="text-gray-500">Description</Text>
              <Text>{initialData.description}</Text>
            </div>
            <div>
              <Text variant="small" weight="semibold" className="text-gray-500">Mission Statement</Text>
              <Text>{initialData.mission}</Text>
            </div>
            <div>
              <Text variant="small" weight="semibold" className="text-gray-500">Band Values</Text>
              <Text>{initialData.values.join(', ') || 'Not set'}</Text>
            </div>
            <div>
              <Text variant="small" weight="semibold" className="text-gray-500">Skills Looking For</Text>
              <Text>{initialData.skillsLookingFor.join(', ') || 'Not set'}</Text>
            </div>
            <div>
              <Text variant="small" weight="semibold" className="text-gray-500">What Members Will Learn</Text>
              <Text>{initialData.whatMembersWillLearn.join(', ') || 'Not set'}</Text>
            </div>
            <div>
              <Text variant="small" weight="semibold" className="text-gray-500">Membership Requirements</Text>
              <Text>{initialData.membershipRequirements}</Text>
            </div>
            {initialData.zipcode && (
              <div>
                <Text variant="small" weight="semibold" className="text-gray-500">Zipcode</Text>
                <Text>{initialData.zipcode}</Text>
              </div>
            )}
            {initialData.imageUrl && (
              <div>
                <Text variant="small" weight="semibold" className="text-gray-500">Band Image</Text>
                <img src={initialData.imageUrl} alt="Band" className="w-20 h-20 object-cover rounded-lg mt-1" />
              </div>
            )}
          </div>
        </Stack>
      </Card>
    )
  }

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <Stack spacing="lg">
          <Heading level={3}>Band Details</Heading>
          <Text variant="muted">Update your band's information.</Text>

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
            rows={4}
            helperText="At least 10 characters"
          />

          <Textarea
            label="Mission Statement"
            required
            value={formData.mission}
            onChange={(e) => setFormData({ ...formData, mission: e.target.value })}
            placeholder="Our mission is to..."
            rows={3}
            helperText="At least 10 characters"
          />

          <Textarea
            label="Band Values"
            required
            value={formData.values}
            onChange={(e) => setFormData({ ...formData, values: e.target.value })}
            placeholder="Creativity, Collaboration, Community"
            rows={2}
            helperText="Separate with commas"
          />

          <Textarea
            label="Skills We're Looking For"
            required
            value={formData.skillsLookingFor}
            onChange={(e) => setFormData({ ...formData, skillsLookingFor: e.target.value })}
            placeholder="Guitar, Drums, Vocals, Marketing"
            rows={2}
            helperText="Separate with commas"
          />

          <Textarea
            label="What Members Will Learn"
            required
            value={formData.whatMembersWillLearn}
            onChange={(e) => setFormData({ ...formData, whatMembersWillLearn: e.target.value })}
            placeholder="Performance skills, Music theory, Band management"
            rows={2}
            helperText="Separate with commas"
          />

          <Textarea
            label="Membership Requirements"
            required
            value={formData.membershipRequirements}
            onChange={(e) => setFormData({ ...formData, membershipRequirements: e.target.value })}
            placeholder="We're looking for committed musicians who can practice weekly..."
            rows={3}
            helperText="At least 10 characters"
          />

          <Input
            label="Zipcode (Optional)"
            type="text"
            value={formData.zipcode}
            onChange={(e) => setFormData({ ...formData, zipcode: e.target.value })}
            placeholder="12345"
            maxLength={5}
            pattern="[0-9]{5}"
            helperText="Leave blank if your band covers a large area"
          />

          <Box>
            <Text variant="small" weight="semibold" className="mb-2">Band Image</Text>
            {formData.imageUrl ? (
              <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                <img src={formData.imageUrl} alt="Band" className="w-16 h-16 object-cover rounded-lg" />
                <div className="flex-1">
                  <Text variant="small">Current image</Text>
                </div>
                <Button type="button" variant="danger" size="sm" onClick={removeImage}>
                  Remove
                </Button>
              </div>
            ) : (
              <FileUpload
                onUpload={handleImageUpload}
                isUploading={isUploadingImage}
                label=""
                description="Upload a logo or image for your band"
                accept="image/jpeg,image/png,image/gif,image/webp"
                maxSizeMB={5}
              />
            )}
          </Box>

          <div className="border-t pt-4">
            <Button
              type="submit"
              variant="primary"
              disabled={updateDetailsMutation.isPending || !hasChanges}
            >
              {updateDetailsMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </Stack>
      </form>
    </Card>
  )
}
