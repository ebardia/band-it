import { router } from '../../trpc'
import { createTask } from './task.create'
import { getTasksByProject, getTaskById, getTasksByBand, getMyTasks } from './task.query'
import { updateTask } from './task.update'
import { submitForVerification, verifyTask } from './task.verify'
import { suggestTasks } from './task.ai'

export const taskRouter = router({
  // Create
  create: createTask,
  
  // Read
  getByProject: getTasksByProject,
  getById: getTaskById,
  getByBand: getTasksByBand,
  getMyTasks: getMyTasks,
  
  // Update
  update: updateTask,
  
  // Verification
  submitForVerification: submitForVerification,
  verify: verifyTask,
  
  // AI
  suggestTasks: suggestTasks,
})