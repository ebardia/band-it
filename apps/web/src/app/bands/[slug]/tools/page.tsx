'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { jwtDecode } from 'jwt-decode'
import {
  Text,
  Stack,
  Button,
  Flex,
  Badge,
  Loading,
  Alert,
  BandLayout,
  Card,
  Modal,
  Input,
} from '@/components/ui'
import { AppNav } from '@/components/AppNav'

// Roles that can access admin tools
const CAN_ACCESS_ADMIN_TOOLS = ['FOUNDER', 'GOVERNOR', 'MODERATOR', 'CONDUCTOR']

interface TaskParameter {
  name: string
  type: string
  format?: string
  description?: string
  default?: unknown
  required?: boolean
  items?: { type: string }
}

// Entity types for audit log filtering
const ENTITY_TYPES = [
  'Band',
  'Member',
  'Proposal',
  'Vote',
  'Project',
  'Task',
  'ChecklistItem',
  'Comment',
  'File',
  'Event',
  'EventRSVP',
  'EventAttendance',
  'Channel',
  'Message',
]

// Roles for announcement targeting
const MEMBER_ROLES = [
  'FOUNDER',
  'GOVERNOR',
  'MODERATOR',
  'CONDUCTOR',
  'VOTING_MEMBER',
  'OBSERVER',
]

export default function ToolsPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  const [userId, setUserId] = useState<string | null>(null)

  // Modal state
  const [selectedTask, setSelectedTask] = useState<any>(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const [parameters, setParameters] = useState<Record<string, unknown>>({})
  const [executionResult, setExecutionResult] = useState<any>(null)

  // History modal state
  const [showHistory, setShowHistory] = useState(false)

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

  const { data: bandData, isLoading: bandLoading } = trpc.band.getBySlug.useQuery(
    { slug },
    { enabled: !!slug }
  )

  const { data: tasksData, isLoading: tasksLoading } = trpc.adminTask.list.useQuery(
    {
      bandId: bandData?.band?.id || '',
      userId: userId || '',
    },
    { enabled: !!bandData?.band?.id && !!userId }
  )

  const { data: previewData, isLoading: previewLoading } = trpc.adminTask.preview.useQuery(
    {
      bandId: bandData?.band?.id || '',
      userId: userId || '',
      taskType: selectedTask?.taskType || '',
      parameters,
    },
    { enabled: !!selectedTask && !!bandData?.band?.id && !!userId }
  )

  const { data: historyData, isLoading: historyLoading } = trpc.adminTask.history.useQuery(
    {
      bandId: bandData?.band?.id || '',
      userId: userId || '',
      page: 1,
      pageSize: 20,
    },
    { enabled: !!bandData?.band?.id && !!userId && showHistory }
  )

  const executeMutation = trpc.adminTask.execute.useMutation({
    onSuccess: (result) => {
      setIsExecuting(false)
      setExecutionResult(result)
    },
    onError: (error) => {
      setIsExecuting(false)
      setExecutionResult({
        success: false,
        summary: 'Task execution failed',
        error: error.message,
      })
    },
  })

  if (bandLoading) {
    return (
      <>
        <AppNav />
        <BandLayout
          bandSlug={slug}
          bandName="Loading..."
          pageTitle="Tools"
          isMember={false}
        >
          <Loading message="Loading..." />
        </BandLayout>
      </>
    )
  }

  if (!bandData?.band) {
    return (
      <>
        <AppNav />
        <BandLayout
          bandSlug={slug}
          bandName=""
          pageTitle="Tools"
          isMember={false}
        >
          <Alert variant="danger">
            <Text>Band not found</Text>
          </Alert>
        </BandLayout>
      </>
    )
  }

  const band = bandData.band
  const currentMember = band.members.find((m: any) => m.user.id === userId)
  const canApprove = currentMember && band.whoCanApprove.includes(currentMember.role)
  const isMember = !!currentMember
  const canAccessAdminTools = currentMember && CAN_ACCESS_ADMIN_TOOLS.includes(currentMember.role)

  if (!canAccessAdminTools) {
    return (
      <>
        <AppNav />
        <BandLayout
          bandSlug={slug}
          bandName={band.name}
          pageTitle="Tools"
          canApprove={canApprove}
          isMember={isMember}
          canAccessAdminTools={false}
        >
          <Alert variant="danger">
            <Text>You do not have permission to access admin tools.</Text>
          </Alert>
        </BandLayout>
      </>
    )
  }

  const openTaskModal = (task: any) => {
    setSelectedTask(task)
    setParameters({})
    setExecutionResult(null)
  }

  const closeTaskModal = () => {
    setSelectedTask(null)
    setParameters({})
    setExecutionResult(null)
  }

  const handleExecute = async () => {
    if (!selectedTask || !bandData?.band?.id || !userId) return

    setIsExecuting(true)
    executeMutation.mutate({
      bandId: bandData.band.id,
      userId,
      taskType: selectedTask.taskType,
      parameters,
    })
  }

  const getIconForTask = (icon: string | null | undefined) => {
    switch (icon) {
      case 'download':
        return '📥'
      case 'file-text':
        return '📄'
      case 'mail':
        return '📧'
      default:
        return '🔧'
    }
  }

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'export':
        return 'Data Export'
      case 'communication':
        return 'Communication'
      default:
        return category.charAt(0).toUpperCase() + category.slice(1)
    }
  }

  const formatDate = (date: Date | string) => {
    const d = new Date(date)
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge variant="success">Completed</Badge>
      case 'RUNNING':
        return <Badge variant="info">Running</Badge>
      case 'FAILED':
        return <Badge variant="danger">Failed</Badge>
      case 'PENDING':
        return <Badge variant="neutral">Pending</Badge>
      default:
        return <Badge variant="neutral">{status}</Badge>
    }
  }

  // Parse parameters schema
  const getTaskParameters = (schema: any): TaskParameter[] => {
    if (!schema || !schema.properties) return []

    return Object.entries(schema.properties).map(([name, prop]: [string, any]) => ({
      name,
      type: prop.type || 'string',
      format: prop.format,
      description: prop.description,
      default: prop.default,
      required: schema.required?.includes(name),
      items: prop.items,
    }))
  }

  const renderParameterInput = (param: TaskParameter) => {
    const value = parameters[param.name] ?? param.default ?? ''

    // Handle date format
    if (param.format === 'date') {
      return (
        <div key={param.name}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {param.description || param.name}
            {param.required && <span className="text-red-500"> *</span>}
          </label>
          <input
            type="date"
            value={String(value)}
            onChange={(e) => setParameters(prev => ({ ...prev, [param.name]: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )
    }

    // Handle array type (for entityTypes and targetRoles multi-select)
    if (param.type === 'array' && (param.name === 'entityTypes' || param.name === 'targetRoles')) {
      const selectedItems = (Array.isArray(value) ? value : []) as string[]
      const options = param.name === 'entityTypes' ? ENTITY_TYPES : MEMBER_ROLES
      return (
        <div key={param.name}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {param.description || param.name}
            {param.required && <span className="text-red-500"> *</span>}
            {param.name === 'targetRoles' && (
              <span className="text-gray-500 font-normal ml-1">(leave empty for all members)</span>
            )}
          </label>
          <div className="border border-gray-300 rounded-md p-3 max-h-48 overflow-y-auto bg-white">
            <div className="grid grid-cols-2 gap-2">
              {options.map((item) => (
                <label key={item} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                  <input
                    type="checkbox"
                    checked={selectedItems.includes(item)}
                    onChange={(e) => {
                      const newSelected = e.target.checked
                        ? [...selectedItems, item]
                        : selectedItems.filter(t => t !== item)
                      setParameters(prev => ({ ...prev, [param.name]: newSelected.length > 0 ? newSelected : undefined }))
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">{item.replace('_', ' ')}</span>
                </label>
              ))}
            </div>
          </div>
          {selectedItems.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {selectedItems.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full"
                >
                  {item.replace('_', ' ')}
                  <button
                    type="button"
                    onClick={() => {
                      const newSelected = selectedItems.filter(t => t !== item)
                      setParameters(prev => ({ ...prev, [param.name]: newSelected.length > 0 ? newSelected : undefined }))
                    }}
                    className="hover:text-blue-900"
                  >
                    ×
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={() => setParameters(prev => ({ ...prev, [param.name]: undefined }))}
                className="text-xs text-gray-500 hover:text-gray-700 ml-2"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )
    }

    switch (param.type) {
      case 'boolean':
        return (
          <label key={param.name} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => setParameters(prev => ({ ...prev, [param.name]: e.target.checked }))}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm">{param.description || param.name}</span>
          </label>
        )
      case 'string':
        if (param.name === 'message') {
          return (
            <div key={param.name}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {param.description || param.name}
                {param.required && <span className="text-red-500"> *</span>}
              </label>
              <textarea
                value={String(value)}
                onChange={(e) => setParameters(prev => ({ ...prev, [param.name]: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={5}
                placeholder={param.description}
              />
            </div>
          )
        }
        return (
          <Input
            key={param.name}
            label={param.description || param.name}
            value={String(value)}
            onChange={(e) => setParameters(prev => ({ ...prev, [param.name]: e.target.value }))}
            required={param.required}
          />
        )
      default:
        return (
          <Input
            key={param.name}
            label={param.description || param.name}
            value={String(value)}
            onChange={(e) => setParameters(prev => ({ ...prev, [param.name]: e.target.value }))}
            required={param.required}
          />
        )
    }
  }

  return (
    <>
      <AppNav />
      <BandLayout
        bandSlug={slug}
        bandName={band.name}
        pageTitle="Admin Tools"
        canApprove={canApprove}
        isMember={isMember}
        canAccessAdminTools={canAccessAdminTools}
        action={
          <Button variant="secondary" onClick={() => setShowHistory(true)}>
            View History
          </Button>
        }
      >
        <Stack spacing="lg">
          <Text color="muted">
            Run administrative tasks for your band. These tools help you manage members, export data, and communicate with your band.
          </Text>

          {tasksLoading ? (
            <Loading message="Loading tools..." />
          ) : !tasksData?.tasks.length ? (
            <Alert variant="info">
              <Text>No admin tools available for your role.</Text>
            </Alert>
          ) : (
            <Stack spacing="xl">
              {Object.entries(tasksData.byCategory).map(([category, tasks]) => (
                <Stack key={category} spacing="md">
                  <Text weight="semibold" className="text-gray-500 uppercase text-sm">
                    {getCategoryLabel(category)}
                  </Text>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(tasks as any[]).map((task) => (
                      <Card
                        key={task.taskType}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => openTaskModal(task)}
                      >
                        <Flex gap="md" align="start">
                          <div className="text-3xl">{getIconForTask(task.icon)}</div>
                          <Stack spacing="xs" className="flex-1">
                            <Text weight="semibold">{task.name}</Text>
                            <Text variant="small" color="muted">{task.description}</Text>
                          </Stack>
                        </Flex>
                      </Card>
                    ))}
                  </div>
                </Stack>
              ))}
            </Stack>
          )}
        </Stack>

        {/* Task Execution Modal */}
        <Modal
          isOpen={!!selectedTask}
          onClose={closeTaskModal}
          title={selectedTask?.name || 'Run Task'}
          size="lg"
        >
          {selectedTask && (
            <Stack spacing="lg">
              <Text color="muted">{selectedTask.description}</Text>

              {/* Parameters Form */}
              {selectedTask.parametersSchema && getTaskParameters(selectedTask.parametersSchema).length > 0 && (
                <Stack spacing="md">
                  <Text weight="semibold">Options</Text>
                  {getTaskParameters(selectedTask.parametersSchema).map(param =>
                    renderParameterInput(param)
                  )}
                </Stack>
              )}

              {/* Preview */}
              {!executionResult && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <Text weight="semibold" className="mb-2">Preview</Text>
                  {previewLoading ? (
                    <Text color="muted">Loading preview...</Text>
                  ) : previewData ? (
                    <Text>{previewData.summary}</Text>
                  ) : (
                    <Text color="muted">Configure options above to see a preview</Text>
                  )}
                </div>
              )}

              {/* Execution Result */}
              {executionResult && (
                <Alert variant={executionResult.success ? 'success' : 'danger'}>
                  <Stack spacing="sm">
                    <Text weight="semibold">{executionResult.success ? 'Success' : 'Failed'}</Text>
                    <Text>{executionResult.summary}</Text>
                    {executionResult.error && (
                      <Text color="muted">{executionResult.error}</Text>
                    )}
                    {executionResult.fileUrl && (
                      <a
                        href={executionResult.fileUrl}
                        download={executionResult.fileName}
                        className="text-blue-600 hover:underline"
                      >
                        Download {executionResult.fileName}
                      </a>
                    )}
                  </Stack>
                </Alert>
              )}

              {/* Actions */}
              <Flex gap="md" justify="end">
                <Button variant="secondary" onClick={closeTaskModal}>
                  {executionResult ? 'Close' : 'Cancel'}
                </Button>
                {!executionResult && (
                  <Button
                    variant="primary"
                    onClick={handleExecute}
                    disabled={isExecuting}
                  >
                    {isExecuting ? 'Running...' : 'Run Task'}
                  </Button>
                )}
              </Flex>
            </Stack>
          )}
        </Modal>

        {/* History Modal */}
        <Modal
          isOpen={showHistory}
          onClose={() => setShowHistory(false)}
          title="Task History"
          size="xl"
        >
          <Stack spacing="md">
            {historyLoading ? (
              <Loading message="Loading history..." />
            ) : !historyData?.items.length ? (
              <Text color="muted">No task executions yet.</Text>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 font-medium text-gray-600">Task</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-600">Status</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-600">Result</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-600">Run By</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-600">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyData.items.map((item) => (
                      <tr key={item.id} className="border-b border-gray-100">
                        <td className="py-2 px-3">
                          <Flex gap="sm" align="center">
                            <span>{getIconForTask(item.taskIcon)}</span>
                            <Text>{item.taskName}</Text>
                          </Flex>
                        </td>
                        <td className="py-2 px-3">{getStatusBadge(item.status)}</td>
                        <td className="py-2 px-3">
                          {item.resultSummary ? (
                            <Text variant="small">{item.resultSummary}</Text>
                          ) : item.errorMessage ? (
                            <Text variant="small" className="text-red-600">{item.errorMessage}</Text>
                          ) : (
                            <Text color="muted">—</Text>
                          )}
                          {item.outputFileUrl && (
                            <a
                              href={item.outputFileUrl}
                              download={item.outputFileName}
                              className="block text-blue-600 hover:underline text-xs"
                            >
                              Download
                            </a>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          <Text variant="small">{item.executedByName}</Text>
                        </td>
                        <td className="py-2 px-3">
                          <Text variant="small" color="muted">{formatDate(item.createdAt)}</Text>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Stack>
        </Modal>
      </BandLayout>
    </>
  )
}
