import { router } from '../../trpc'
import { proposalCreateRouter } from './proposal.create'
import { proposalQueryRouter } from './proposal.query'
import { proposalUpdateRouter } from './proposal.update'
import { proposalVoteRouter } from './proposal.vote'
import { proposalAiRouter } from './proposal.ai'

export const proposalRouter = router({
  // Create
  create: proposalCreateRouter.create,
  
  // Query
  getByBand: proposalQueryRouter.getByBand,
  getById: proposalQueryRouter.getById,
  getMyPendingVotes: proposalQueryRouter.getMyPendingVotes,
  getMyProposals: proposalQueryRouter.getMyProposals,
  
  // Update
  update: proposalUpdateRouter.update,
  
  // Vote
  vote: proposalVoteRouter.vote,
  closeProposal: proposalVoteRouter.closeProposal,
  
  // AI
  generateDraft: proposalAiRouter.generateDraft,
})