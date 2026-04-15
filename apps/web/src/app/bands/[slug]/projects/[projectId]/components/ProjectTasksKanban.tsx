'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { Text, Stack, Badge, Button } from '@/components/ui'

export type KanbanTaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED' | 'BLOCKED'

const COLUMN_ORDER: KanbanTaskStatus[] = [
  'TODO',
  'IN_PROGRESS',
  'IN_REVIEW',
  'BLOCKED',
  'COMPLETED',
]

const COLUMN_LABEL: Record<KanbanTaskStatus, string> = {
  TODO: 'To do',
  IN_PROGRESS: 'In progress',
  IN_REVIEW: 'In review',
  COMPLETED: 'Done',
  BLOCKED: 'Blocked',
}

function resolveDropColumn(
  overId: string | null | undefined,
  tasks: { id: string; status: string }[],
): KanbanTaskStatus | null {
  if (!overId) return null
  if (COLUMN_ORDER.includes(overId as KanbanTaskStatus)) {
    return overId as KanbanTaskStatus
  }
  const task = tasks.find((t) => t.id === overId)
  return task ? (task.status as KanbanTaskStatus) : null
}

function canDragTask(params: {
  task: { status: string; assigneeId: string | null }
  userId: string | null
  canUpdateProject: boolean
}): boolean {
  const { task, userId, canUpdateProject } = params
  if (task.status === 'COMPLETED') return false
  if (task.status === 'IN_REVIEW') return false
  const isAssignee = !!(userId && task.assigneeId === userId)
  const canModify = isAssignee || canUpdateProject
  return canModify
}

/** Client-side rules aligned with list actions + server constraints. */
function planBoardMove(params: {
  task: {
    id: string
    status: string
    requiresVerification: boolean
  }
  target: KanbanTaskStatus
  canModify: boolean
}):
  | { action: 'none' }
  | { action: 'status'; status: KanbanTaskStatus }
  | { action: 'submit' }
  | { action: 'reject'; message: string } {
  const { task, target, canModify } = params
  if (!canModify) return { action: 'reject', message: 'You cannot move this task.' }
  if (task.status === target) return { action: 'none' }
  if (task.status === 'COMPLETED') {
    return { action: 'reject', message: 'Completed tasks cannot be moved.' }
  }
  if (task.status === 'IN_REVIEW') {
    return { action: 'reject', message: 'Use Review to approve or send back tasks in review.' }
  }

  const from = task.status as KanbanTaskStatus

  if (target === 'IN_REVIEW') {
    if (from !== 'IN_PROGRESS') {
      return { action: 'reject', message: 'Only in-progress tasks can be submitted for review.' }
    }
    if (!task.requiresVerification) {
      return {
        action: 'reject',
        message: 'This task does not require verification — move it to Done instead.',
      }
    }
    return { action: 'submit' }
  }

  if (target === 'COMPLETED') {
    if (from !== 'IN_PROGRESS') {
      return { action: 'reject', message: 'Only in-progress tasks can be completed this way.' }
    }
    if (task.requiresVerification) {
      return {
        action: 'reject',
        message: 'Submit this task for review first — it requires verification.',
      }
    }
    return { action: 'status', status: 'COMPLETED' }
  }

  if (target === 'IN_PROGRESS') {
    if (from === 'TODO' || from === 'BLOCKED') {
      return { action: 'status', status: 'IN_PROGRESS' }
    }
    if (from === 'IN_PROGRESS') return { action: 'none' }
    return { action: 'reject', message: 'Move blocked or to-do tasks here to start work.' }
  }

  if (target === 'BLOCKED') {
    if (from === 'IN_PROGRESS' || from === 'TODO') {
      return { action: 'status', status: 'BLOCKED' }
    }
    return { action: 'reject', message: 'Only active or to-do tasks can be marked blocked.' }
  }

  if (target === 'TODO') {
    if (from === 'IN_PROGRESS' || from === 'BLOCKED') {
      return { action: 'status', status: 'TODO' }
    }
    return { action: 'reject', message: 'Only in-progress or blocked tasks can return to To do.' }
  }

  return { action: 'reject', message: 'That move is not supported.' }
}

function KanbanColumn({
  status,
  count,
  children,
}: {
  status: KanbanTaskStatus
  count: number
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div
      ref={setNodeRef}
      className={[
        'flex flex-col rounded-lg border bg-gray-50/80 transition-colors',
        'w-[min(88vw,20rem)] max-md:flex-shrink-0 max-md:snap-start md:min-w-0 md:w-auto md:flex-1',
        isOver ? 'border-blue-400 bg-blue-50/50 ring-2 ring-blue-200' : 'border-gray-200',
      ].join(' ')}
    >
      <div className="sticky top-0 z-[1] flex items-center justify-between gap-2 border-b border-gray-200 bg-gray-50/95 px-3 py-2 backdrop-blur-sm">
        <Text weight="semibold" className="text-sm">
          {COLUMN_LABEL[status]}
        </Text>
        <Badge variant="neutral">{count}</Badge>
      </div>
      <div className="flex max-h-[min(70vh,520px)] flex-col gap-2 overflow-y-auto p-2">{children}</div>
    </div>
  )
}

function KanbanTaskCard({
  task,
  bandSlug,
  disabledDrag,
  highlighted,
}: {
  task: any
  bandSlug: string
  disabledDrag: boolean
  highlighted: boolean
}) {
  const router = useRouter()
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    disabled: disabledDrag,
    data: { task },
  })

  const style = transform
    ? { transform: `translate3d(${transform.x}px,${transform.y}px,0)` }
    : undefined

  const checklistCount = task._count?.checklistItems ?? 0

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        'flex gap-2 rounded-md border border-gray-200 bg-white p-2 shadow-sm',
        isDragging ? 'opacity-40' : 'opacity-100',
        highlighted ? 'ring-2 ring-blue-400' : '',
      ].join(' ')}
    >
      {!disabledDrag ? (
        <button
          type="button"
          className="mt-0.5 flex h-8 w-6 flex-shrink-0 cursor-grab touch-none items-center justify-center rounded border border-transparent text-gray-400 hover:bg-gray-100 active:cursor-grabbing"
          aria-label="Drag to change column"
          {...listeners}
          {...attributes}
        >
          <span className="text-[10px] font-mono leading-none select-none" aria-hidden>
            ::
          </span>
        </button>
      ) : (
        <div className="w-2 flex-shrink-0" aria-hidden />
      )}
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => router.push(`/bands/${bandSlug}/tasks/${task.id}`)}
          className="w-full text-left"
        >
          <Text
            variant="small"
            weight="semibold"
            className={`line-clamp-2 hover:text-blue-600 ${task.status === 'COMPLETED' ? 'text-gray-400 line-through' : ''}`}
          >
            {task.name}
          </Text>
        </button>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500">
          {task.assignee ? (
            <span className="truncate">{task.assignee.name}</span>
          ) : (
            <span className="text-orange-600">Unassigned</span>
          )}
          {task.dueDate && (
            <span>{new Date(task.dueDate).toLocaleDateString()}</span>
          )}
          {checklistCount > 0 && <span>{checklistCount} checklist</span>}
          {task.requiresVerification && task.status !== 'COMPLETED' && (
            <span className="text-blue-600">Verification</span>
          )}
        </div>
      </div>
    </div>
  )
}

function KanbanCardPreview({ task }: { task: any }) {
  return (
    <div className="flex max-w-[280px] gap-2 rounded-md border border-blue-200 bg-white p-2 shadow-lg">
      <span className="text-xs font-mono text-gray-400" aria-hidden>
        ::
      </span>
      <Text variant="small" weight="semibold" className="line-clamp-2">
        {task.name}
      </Text>
    </div>
  )
}

export interface ProjectTasksKanbanProps {
  tasks: any[]
  bandSlug: string
  userId: string | null
  canUpdateProject: boolean
  canVerify: boolean
  highlightedTaskId: string | null
  onStatusChange: (taskId: string, status: KanbanTaskStatus) => void
  onSubmitForVerification: (task: any) => void
  onReview: (task: any) => void
  isUpdating: boolean
  onInvalidMove: (message: string) => void
}

export function ProjectTasksKanban({
  tasks,
  bandSlug,
  userId,
  canUpdateProject,
  canVerify,
  highlightedTaskId,
  onStatusChange,
  onSubmitForVerification,
  onReview,
  isUpdating,
  onInvalidMove,
}: ProjectTasksKanbanProps) {
  const [activeTask, setActiveTask] = useState<any | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 220, tolerance: 6 },
    }),
  )

  const grouped = useMemo(() => {
    const map: Record<KanbanTaskStatus, any[]> = {
      TODO: [],
      IN_PROGRESS: [],
      IN_REVIEW: [],
      COMPLETED: [],
      BLOCKED: [],
    }
    for (const t of tasks) {
      const s = t.status as KanbanTaskStatus
      if (map[s]) map[s].push(t)
      else map.TODO.push(t)
    }
    for (const k of COLUMN_ORDER) {
      map[k].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
    }
    return map
  }, [tasks])

  const handleDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id)
    const task = tasks.find((t) => t.id === id)
    setActiveTask(task ?? null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    try {
      if (isUpdating || !over) return

      const task = tasks.find((t) => t.id === String(active.id))
      if (!task) return

      const target = resolveDropColumn(String(over.id), tasks)
      if (!target) return

      const isAssignee = !!(userId && task.assigneeId === userId)
      const canModify = isAssignee || canUpdateProject

      const plan = planBoardMove({
        task: {
          id: task.id,
          status: task.status,
          requiresVerification: !!task.requiresVerification,
        },
        target,
        canModify,
      })

      if (plan.action === 'none') return
      if (plan.action === 'reject') {
        onInvalidMove(plan.message)
        return
      }
      if (plan.action === 'submit') {
        onSubmitForVerification(task)
        return
      }
      if (plan.action === 'status') {
        onStatusChange(task.id, plan.status)
      }
    } finally {
      setActiveTask(null)
    }
  }

  const handleDragCancel = () => setActiveTask(null)

  return (
    <Stack spacing="md">
      <Text variant="small" color="muted" className="md:hidden">
        Swipe sideways to see all columns. Long-press the grip on the left, then drag the card to another column.
      </Text>
      <Text variant="small" color="muted" className="hidden md:block">
        Drag the grip on the left to change columns. Moves follow the same rules as the list view (for example,
        tasks that require verification use Submit and Review).
      </Text>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex flex-row gap-3 max-md:-mx-1 max-md:snap-x max-md:snap-mandatory max-md:overflow-x-auto max-md:overscroll-x-contain max-md:px-1 max-md:pb-3 max-md:pt-1 max-md:[scrollbar-width:thin] max-md:touch-pan-x md:overflow-visible">
          {COLUMN_ORDER.map((status) => (
            <KanbanColumn key={status} status={status} count={grouped[status].length}>
              {grouped[status].map((task) => (
                <div key={task.id} className="space-y-2">
                  <KanbanTaskCard
                    task={task}
                    bandSlug={bandSlug}
                    disabledDrag={
                      !canDragTask({
                        task: { status: task.status, assigneeId: task.assigneeId },
                        userId,
                        canUpdateProject,
                      })
                    }
                    highlighted={highlightedTaskId === task.id}
                  />
                  {task.status === 'IN_REVIEW' && canVerify && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      onClick={() => onReview(task)}
                      disabled={isUpdating}
                    >
                      Review
                    </Button>
                  )}
                </div>
              ))}
            </KanbanColumn>
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeTask ? <KanbanCardPreview task={activeTask} /> : null}
        </DragOverlay>
      </DndContext>
    </Stack>
  )
}
