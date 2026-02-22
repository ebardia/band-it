'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { jwtDecode } from 'jwt-decode'
import {
  Heading,
  Text,
  Stack,
  Button,
  Card,
  Alert,
  Loading,
  useToast,
  AdminLayout,
} from '@/components/ui'
import { AppNav } from '@/components/AppNav'

interface CronJob {
  id: string
  name: string
  description: string
  schedule: string
  mutationKey: 'triggerDigestJob' | 'triggerTaskEscalation' | 'triggerChecklistEscalation' | 'triggerGracePeriodCheck' | 'triggerBillingOwnerCheck' | 'triggerLowMemberCheck' | 'triggerAutoConfirms' | 'triggerAutoConfirmWarnings'
}

const cronJobs: CronJob[] = [
  {
    id: 'digest',
    name: 'Digest Emails',
    description: 'Send daily digest emails to users with pending actions',
    schedule: '8 AM UTC',
    mutationKey: 'triggerDigestJob',
  },
  {
    id: 'task-escalation',
    name: 'Task Escalation',
    description: 'Send reminders and escalate tasks awaiting verification',
    schedule: '9 AM UTC',
    mutationKey: 'triggerTaskEscalation',
  },
  {
    id: 'checklist-escalation',
    name: 'Checklist Escalation',
    description: 'Send reminders and escalate checklist items awaiting verification',
    schedule: '9 AM UTC',
    mutationKey: 'triggerChecklistEscalation',
  },
  {
    id: 'grace-period',
    name: 'Grace Period Check',
    description: 'Deactivate bands past their payment grace period',
    schedule: '2 AM UTC',
    mutationKey: 'triggerGracePeriodCheck',
  },
  {
    id: 'billing-owner',
    name: 'Billing Owner Check',
    description: 'Notify bands that need a billing owner assigned',
    schedule: '3 AM UTC',
    mutationKey: 'triggerBillingOwnerCheck',
  },
  {
    id: 'low-member',
    name: 'Low Member Count Check',
    description: 'Warn bands with active subscriptions but low member counts',
    schedule: '4 AM UTC',
    mutationKey: 'triggerLowMemberCheck',
  },
  {
    id: 'auto-confirms',
    name: 'Auto-Confirm Payments',
    description: 'Auto-confirm manual payments after 7 days',
    schedule: '5 AM UTC',
    mutationKey: 'triggerAutoConfirms',
  },
  {
    id: 'auto-confirm-warnings',
    name: 'Auto-Confirm Warnings',
    description: 'Send warnings for payments about to be auto-confirmed',
    schedule: '6 AM UTC',
    mutationKey: 'triggerAutoConfirmWarnings',
  },
]

export default function CronJobsPage() {
  const router = useRouter()
  const { showToast } = useToast()
  const [userId, setUserId] = useState<string | null>(null)
  const [runningJob, setRunningJob] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      try {
        const decoded: any = jwtDecode(token)
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
    { enabled: !!userId }
  )

  // @ts-ignore - tRPC type depth issue
  const digestMutation = trpc.admin.triggerDigestJob.useMutation()
  // @ts-ignore
  const taskEscalationMutation = trpc.admin.triggerTaskEscalation.useMutation()
  // @ts-ignore
  const checklistEscalationMutation = trpc.admin.triggerChecklistEscalation.useMutation()
  // @ts-ignore
  const gracePeriodMutation = trpc.admin.triggerGracePeriodCheck.useMutation()
  // @ts-ignore
  const billingOwnerMutation = trpc.admin.triggerBillingOwnerCheck.useMutation()
  // @ts-ignore
  const lowMemberMutation = trpc.admin.triggerLowMemberCheck.useMutation()
  // @ts-ignore
  const autoConfirmsMutation = trpc.admin.triggerAutoConfirms.useMutation()
  // @ts-ignore
  const autoConfirmWarningsMutation = trpc.admin.triggerAutoConfirmWarnings.useMutation()

  const mutations: Record<string, any> = {
    triggerDigestJob: digestMutation,
    triggerTaskEscalation: taskEscalationMutation,
    triggerChecklistEscalation: checklistEscalationMutation,
    triggerGracePeriodCheck: gracePeriodMutation,
    triggerBillingOwnerCheck: billingOwnerMutation,
    triggerLowMemberCheck: lowMemberMutation,
    triggerAutoConfirms: autoConfirmsMutation,
    triggerAutoConfirmWarnings: autoConfirmWarningsMutation,
  }

  const handleRunJob = async (job: CronJob) => {
    if (!userId) return

    setRunningJob(job.id)
    try {
      const mutation = mutations[job.mutationKey]
      const result = await mutation.mutateAsync({ userId })
      showToast(`${job.name} completed successfully`, 'success')
      if (result.result) {
        console.log(`${job.name} result:`, result.result)
      }
    } catch (error: any) {
      showToast(error.message || `${job.name} failed`, 'error')
    } finally {
      setRunningJob(null)
    }
  }

  if (profileLoading) {
    return (
      <>
        <AppNav />
        <AdminLayout pageTitle="Cron Jobs" subtitle="Loading...">
          <Loading message="Checking permissions..." />
        </AdminLayout>
      </>
    )
  }

  if (!profileData?.user?.isAdmin) {
    return (
      <>
        <AppNav />
        <AdminLayout pageTitle="Access Denied">
          <Alert variant="danger">
            <Stack spacing="sm">
              <Text weight="semibold">You do not have permission to access the admin area.</Text>
              <Text variant="small">This area is restricted to platform administrators only.</Text>
            </Stack>
          </Alert>
        </AdminLayout>
      </>
    )
  }

  return (
    <>
      <AppNav />
      <AdminLayout pageTitle="Cron Jobs" subtitle="Manually trigger scheduled jobs">
        <Stack spacing="xl">
          <Alert variant="warning">
            <Text>
              Running jobs manually will execute them immediately with real effects (sending emails, updating records, etc.).
              Use with caution.
            </Text>
          </Alert>

          <Stack spacing="md">
            {cronJobs.map((job) => (
              <Card key={job.id}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Heading level={3}>{job.name}</Heading>
                    <Text color="muted" variant="small">{job.description}</Text>
                    <Text variant="small" className="mt-1">
                      Schedule: <span className="font-medium">{job.schedule}</span>
                    </Text>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => handleRunJob(job)}
                    disabled={runningJob !== null}
                  >
                    {runningJob === job.id ? 'Running...' : 'Run Now'}
                  </Button>
                </div>
              </Card>
            ))}
          </Stack>
        </Stack>
      </AdminLayout>
    </>
  )
}
