import { router } from '../../trpc'
import { createTask } from './task.create'
import { getTasksByProject, getTaskById, getTasksByBand } from './task.query'
import { updateTask } from './task.update'
import { submitForVerification, verifyTask } from './task.verify'

export const taskRouter = router({
  // Create
  create: createTask,
  
  // Read
  getByProject: getTasksByProject,
  getById: getTaskById,
  getByBand: getTasksByBand,
  
  // Update
  update: updateTask,
  
  // Verification
  submitForVerification: submitForVerification,
  verify: verifyTask,
})