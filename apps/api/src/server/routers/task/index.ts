import { router, publicProcedure } from '../../trpc'
import { createTask } from './task.create'
import { getTasksByProject, getTaskById, getTasksByBand, getMyTasks, getMyProjectTasks, getClaimableTasks } from './task.query'
import { updateTask } from './task.update'
import { submitForVerification, verifyTask } from './task.verify'
import { claimTask, unclaimTask, retryTask, updateTaskContext } from './task.claim'
import { suggestTasks } from './task.ai'
import { runTaskEscalationJob } from '../../../cron/task-escalation-cron'

export const taskRouter = router({
  // Create
  create: createTask,

  // Read
  getByProject: getTasksByProject,
  getById: getTaskById,
  getByBand: getTasksByBand,
  getMyTasks: getMyTasks,
  getMyProjectTasks: getMyProjectTasks,
  getClaimableTasks: getClaimableTasks,

  // Update
  update: updateTask,

  // Claiming
  claim: claimTask,
  unclaim: unclaimTask,
  retry: retryTask,
  updateContext: updateTaskContext,

  // Verification
  submitForVerification: submitForVerification,
  verify: verifyTask,

  // AI
  suggestTasks: suggestTasks,

  // Admin/Testing
  triggerEscalation: publicProcedure.mutation(async () => {
    const result = await runTaskEscalationJob()
    return result
  }),
})