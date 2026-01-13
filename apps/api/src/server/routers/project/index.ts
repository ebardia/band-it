import { router } from '../../trpc'
import { createProject } from './project.create'
import { getProjectsByProposal, getProjectById, getProjectsByBand } from './project.query'
import { updateProject } from './project.update'
import { suggestProjects } from './project.ai'

export const projectRouter = router({
  // Create
  create: createProject,
  
  // Read
  getByProposal: getProjectsByProposal,
  getById: getProjectById,
  getByBand: getProjectsByBand,
  
  // Update
  update: updateProject,
  
  // AI
  aiSuggest: suggestProjects,
})