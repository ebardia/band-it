import { router } from '../../trpc'
import { createProject } from './project.create'
import { getProjectsByProposal, getProjectById, getProjectsByBand, getMyProjects } from './project.query'
import { updateProject } from './project.update'
import { suggestProjects } from './project.ai'

export const projectRouter = router({
  // Create
  create: createProject,
  
  // Read
  getByProposal: getProjectsByProposal,
  getById: getProjectById,
  getByBand: getProjectsByBand,
  getMyProjects: getMyProjects,
  
  // Update
  update: updateProject,
  
  // AI
  aiSuggest: suggestProjects,
})