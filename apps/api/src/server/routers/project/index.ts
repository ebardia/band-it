import { router } from '../../trpc'
import { createProject } from './project.create'
import { getProjectsByProposal, getProjectById, getProjectsByBand, getMyProjects, getProjectDeliverables } from './project.query'
import { updateProject } from './project.update'
import { suggestProjects } from './project.ai'
import { projectHierarchyRouter } from './project.hierarchy'

export const projectRouter = router({
  // Create
  create: createProject,

  // Read
  getByProposal: getProjectsByProposal,
  getById: getProjectById,
  getByBand: getProjectsByBand,
  getMyProjects: getMyProjects,
  getDeliverables: getProjectDeliverables,

  // Hierarchy (expandable projects page)
  getProjectsList: projectHierarchyRouter.getProjectsList,
  getTasksForProject: projectHierarchyRouter.getTasksForProject,
  getChecklistForTask: projectHierarchyRouter.getChecklistForTask,

  // Update
  update: updateProject,

  // AI
  aiSuggest: suggestProjects,
})