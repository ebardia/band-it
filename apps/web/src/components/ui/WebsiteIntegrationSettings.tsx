'use client'

import { useState, useEffect } from 'react'
import { trpc } from '@/lib/trpc'
import {
  Stack,
  Text,
  Button,
  Alert,
  Loading,
  Input,
  Flex,
  useToast,
} from '@/components/ui'

interface WebsiteIntegrationSettingsProps {
  bandId: string
  userId: string
  userRole?: string
}

export function WebsiteIntegrationSettings({ bandId, userId, userRole }: WebsiteIntegrationSettingsProps) {
  const { showToast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [publicWebsiteUrl, setPublicWebsiteUrl] = useState('')
  const [webhookUrl, setWebhookUrl] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [showWebhookSecret, setShowWebhookSecret] = useState(false)

  const utils = trpc.useUtils()

  const canManage = userRole === 'FOUNDER' || userRole === 'GOVERNOR'
  const canSendStatusUpdate = ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR'].includes(userRole || '')

  // Query only runs for managers (FOUNDER/GOVERNOR)
  const { data, isLoading, error } = trpc.band.getWebsiteSettings.useQuery(
    { bandId, userId },
    { enabled: !!bandId && !!userId && canManage }
  )

  const updateMutation = trpc.band.updateWebsiteSettings.useMutation({
    onSuccess: () => {
      showToast('Website settings updated', 'success')
      setIsEditing(false)
      utils.band.getWebsiteSettings.invalidate({ bandId, userId })
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  const generateApiKeyMutation = trpc.band.generateApiKey.useMutation({
    onSuccess: () => {
      showToast('API key generated. Copy it now - it won\'t be shown again!', 'success')
      setShowApiKey(true)
      utils.band.getWebsiteSettings.invalidate({ bandId, userId })
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  const generateWebhookSecretMutation = trpc.band.generateWebhookSecret.useMutation({
    onSuccess: () => {
      showToast('Webhook secret generated. Copy it now - it won\'t be shown again!', 'success')
      setShowWebhookSecret(true)
      utils.band.getWebsiteSettings.invalidate({ bandId, userId })
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  const sendStatusUpdateMutation = trpc.band.sendStatusUpdate.useMutation({
    onSuccess: () => {
      showToast('Status update sent to your website successfully!', 'success')
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  // Initialize form values when data loads
  useEffect(() => {
    if (data?.settings) {
      setPublicWebsiteUrl(data.settings.publicWebsiteUrl)
      setWebhookUrl(data.settings.webhookUrl)
    }
  }, [data?.settings])

  const handleSave = () => {
    updateMutation.mutate({
      bandId,
      userId,
      publicWebsiteUrl: publicWebsiteUrl || '',
      webhookUrl: webhookUrl || '',
    })
  }

  const handleCancel = () => {
    if (data?.settings) {
      setPublicWebsiteUrl(data.settings.publicWebsiteUrl)
      setWebhookUrl(data.settings.webhookUrl)
    }
    setIsEditing(false)
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    showToast(`${label} copied to clipboard`, 'success')
  }

  // Don't show to users who can neither manage nor send status updates
  if (!canManage && !canSendStatusUpdate) {
    return null
  }

  // For non-managers (CONDUCTOR/MODERATOR), show simplified view
  if (!canManage && canSendStatusUpdate) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <Stack spacing="md">
          <Text weight="semibold" className="text-lg">Send Status Update</Text>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <Flex justify="between" align="center">
              <div>
                <Text weight="semibold">Send Weekly Status Update</Text>
                <Text variant="small" className="text-gray-600">
                  Manually send a status update with the last 7 days of activity to your band's website.
                </Text>
                <Text variant="small" className="text-gray-500 mt-1">
                  Includes: proposals, completed tasks, events, member changes
                </Text>
              </div>
              <Button
                onClick={() => sendStatusUpdateMutation.mutate({ bandId, userId })}
                disabled={sendStatusUpdateMutation.isPending}
              >
                {sendStatusUpdateMutation.isPending ? 'Sending...' : 'Send Now'}
              </Button>
            </Flex>
            <Text variant="small" className="text-green-700 mt-2">
              Status updates are also sent automatically every Sunday at 6 PM UTC.
            </Text>
          </div>
        </Stack>
      </div>
    )
  }

  // From here, canManage is true (FOUNDER/GOVERNOR view)
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <Loading message="Loading website settings..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <Alert variant="danger">
          <Text>Error loading website settings: {error.message}</Text>
        </Alert>
      </div>
    )
  }

  const settings = data?.settings

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <Stack spacing="md">
        <Flex justify="between" align="center">
          <Stack spacing="xs">
            <Text weight="semibold" className="text-lg">Website Integration</Text>
            <Text variant="small" className="text-gray-500">
              Connect your band's public website to receive applications and send updates
            </Text>
          </Stack>
          {!isEditing && (
            <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
              Edit
            </Button>
          )}
        </Flex>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <Text variant="small" className="text-blue-800">
            <strong>How it works:</strong> Your external website can send applications and contact forms
            to BAND IT using the API key. BAND IT will send event notifications to your website's
            webhook URL.
          </Text>
        </div>

        {/* URLs Section */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Public Website URL
            </label>
            {isEditing ? (
              <Input
                value={publicWebsiteUrl}
                onChange={(e) => setPublicWebsiteUrl(e.target.value)}
                placeholder="https://your-band-website.com"
                className="font-mono"
              />
            ) : (
              <Text className="font-mono text-gray-600">
                {settings?.publicWebsiteUrl || 'Not configured'}
              </Text>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Webhook URL (receives events from BAND IT)
            </label>
            {isEditing ? (
              <Input
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://your-band-website.com/api/webhook"
                className="font-mono"
              />
            ) : (
              <Text className="font-mono text-gray-600">
                {settings?.webhookUrl || 'Not configured'}
              </Text>
            )}
          </div>
        </div>

        {/* Save/Cancel buttons when editing */}
        {isEditing && (
          <Flex gap="sm">
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button variant="secondary" onClick={handleCancel}>
              Cancel
            </Button>
          </Flex>
        )}

        <hr className="my-2" />

        {/* API Key Section */}
        <div>
          <Text weight="semibold" className="mb-2">API Key (for your website to authenticate)</Text>
          {settings?.publicApiKey ? (
            <div className="flex items-center gap-2">
              <code className="bg-gray-100 px-3 py-2 rounded font-mono text-sm flex-1">
                {showApiKey ? settings.publicApiKey : settings.publicApiKey.slice(0, 8) + '...' + settings.publicApiKey.slice(-4)}
              </code>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? 'Hide' : 'Show'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => copyToClipboard(settings.publicApiKey, 'API key')}
              >
                Copy
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => generateApiKeyMutation.mutate({ bandId, userId })}
                disabled={generateApiKeyMutation.isPending}
              >
                Regenerate
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => generateApiKeyMutation.mutate({ bandId, userId })}
              disabled={generateApiKeyMutation.isPending}
            >
              {generateApiKeyMutation.isPending ? 'Generating...' : 'Generate API Key'}
            </Button>
          )}
        </div>

        {/* Webhook Secret Section */}
        <div>
          <Text weight="semibold" className="mb-2">Webhook Secret (to verify webhook signatures)</Text>
          {settings?.webhookSecret ? (
            <div className="flex items-center gap-2">
              <code className="bg-gray-100 px-3 py-2 rounded font-mono text-sm flex-1">
                {showWebhookSecret ? settings.webhookSecret : settings.webhookSecret.slice(0, 10) + '...' + settings.webhookSecret.slice(-4)}
              </code>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowWebhookSecret(!showWebhookSecret)}
              >
                {showWebhookSecret ? 'Hide' : 'Show'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => copyToClipboard(settings.webhookSecret, 'Webhook secret')}
              >
                Copy
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => generateWebhookSecretMutation.mutate({ bandId, userId })}
                disabled={generateWebhookSecretMutation.isPending}
              >
                Regenerate
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => generateWebhookSecretMutation.mutate({ bandId, userId })}
              disabled={generateWebhookSecretMutation.isPending}
            >
              {generateWebhookSecretMutation.isPending ? 'Generating...' : 'Generate Webhook Secret'}
            </Button>
          )}
        </div>

        {/* Send Status Update Section */}
        {settings?.webhookUrl && settings?.webhookSecret && (
          <>
            <hr className="my-2" />
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <Flex justify="between" align="center">
                <div>
                  <Text weight="semibold">Send Weekly Status Update</Text>
                  <Text variant="small" className="text-gray-600">
                    Manually send a status update with the last 7 days of activity to your website.
                  </Text>
                  <Text variant="small" className="text-gray-500 mt-1">
                    Includes: proposals, completed tasks, events, member changes
                  </Text>
                </div>
                <Button
                  onClick={() => sendStatusUpdateMutation.mutate({ bandId, userId })}
                  disabled={sendStatusUpdateMutation.isPending}
                >
                  {sendStatusUpdateMutation.isPending ? 'Sending...' : 'Send Now'}
                </Button>
              </Flex>
              <Text variant="small" className="text-green-700 mt-2">
                Status updates are also sent automatically every Sunday at 6 PM UTC.
              </Text>
            </div>
          </>
        )}

        {/* API Documentation */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4">
          <Text weight="semibold" className="mb-2">API Endpoints</Text>
          <div className="space-y-2 font-mono text-sm">
            <div>
              <Text variant="small" className="text-gray-600">Send applications/contacts:</Text>
              <code className="block bg-white px-2 py-1 rounded border mt-1">
                POST /api/public/bands/[slug]/inbound
              </code>
            </div>
            <div>
              <Text variant="small" className="text-gray-600">Get band info (no auth):</Text>
              <code className="block bg-white px-2 py-1 rounded border mt-1">
                GET /api/public/bands/[slug]/info
              </code>
            </div>
            <div>
              <Text variant="small" className="text-gray-600">Get members (requires API key):</Text>
              <code className="block bg-white px-2 py-1 rounded border mt-1">
                GET /api/public/bands/[slug]/members
              </code>
            </div>
          </div>
          <Text variant="small" className="text-gray-500 mt-3">
            Include the API key in the <code className="bg-gray-200 px-1 rounded">X-API-Key</code> header.
          </Text>
        </div>
      </Stack>
    </div>
  )
}
