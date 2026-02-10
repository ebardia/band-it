import { router } from '../../trpc'
import { proposalCreateRouter } from './proposal.create'
import { proposalQueryRouter } from './proposal.query'
import { proposalUpdateRouter } from './proposal.update'
import { proposalVoteRouter } from './proposal.vote'
import { proposalAiRouter } from './proposal.ai'
import { proposalReviewRouter } from './proposal.review'
import { proposalHierarchyRouter } from './proposal.hierarchy'

export const proposalRouter = router({
  // Create
  create: proposalCreateRouter.create,

  // Query
  getByBand: proposalQueryRouter.getByBand,
  getById: proposalQueryRouter.getById,
  getMyPendingVotes: proposalQueryRouter.getMyPendingVotes,
  getMyProposals: proposalQueryRouter.getMyProposals,

  // Hierarchy (expandable proposals page)
  getProposalsList: proposalHierarchyRouter.getProposalsList,
  getProjectsForProposal: proposalHierarchyRouter.getProjectsForProposal,
  getTasksForProject: proposalHierarchyRouter.getTasksForProject,
  getChecklistForTask: proposalHierarchyRouter.getChecklistForTask,

  // Update/Edit
  edit: proposalUpdateRouter.edit,
  getEditHistory: proposalUpdateRouter.getEditHistory,

  // Vote
  vote: proposalVoteRouter.vote,
  closeProposal: proposalVoteRouter.closeProposal,

  // AI
  generateDraft: proposalAiRouter.generateDraft,

  // Review
  submitForReview: proposalReviewRouter.submitForReview,
  approveProposal: proposalReviewRouter.approveProposal,
  rejectProposal: proposalReviewRouter.rejectProposal,
  withdraw: proposalReviewRouter.withdraw,
  resubmit: proposalReviewRouter.resubmit,
  getPendingReview: proposalReviewRouter.getPendingReview,
  getReviewHistory: proposalReviewRouter.getReviewHistory,
})