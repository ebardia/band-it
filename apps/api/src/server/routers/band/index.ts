import { router } from '../../trpc'
import { bandCreateRouter } from './band.create'
import { bandQueryRouter } from './band.query'
import { bandApplicationRouter } from './band.application'
import { bandInviteRouter } from './band.invite'
import { bandMatchingRouter } from './band.matching'
import { bandBillingRouter } from './band.billing'
import { bandDissolveRouter } from './band.dissolve'
import { bandGovernanceRouter } from './band.governance'
import { bandUpdateRouter } from './band.update'
import { bandAIInstructionRouter } from './band.aiInstruction'
import { bandWebsiteRouter } from './band.website'
import { getMembers, getMemberProfile, changeRole, proposeRemoval, transferOwnership, nominateAsFounder } from './band.members'

export const bandRouter = router({
  // Create
  create: bandCreateRouter.create,

  // Query
  getAll: bandQueryRouter.getAll,
  getMyBands: bandQueryRouter.getMyBands,
  getBySlug: bandQueryRouter.getBySlug,

  // Applications
  applyToJoin: bandApplicationRouter.applyToJoin,
  getPendingApplications: bandApplicationRouter.getPendingApplications,
  getMyApplicationsToReview: bandApplicationRouter.getMyApplicationsToReview,
  approveApplication: bandApplicationRouter.approveApplication,
  rejectApplication: bandApplicationRouter.rejectApplication,

  // Invites
  searchUsers: bandInviteRouter.searchUsers,
  inviteUser: bandInviteRouter.inviteUser,
  inviteByEmail: bandInviteRouter.inviteByEmail,
  getMyInvitations: bandInviteRouter.getMyInvitations,
  acceptInvitation: bandInviteRouter.acceptInvitation,
  declineInvitation: bandInviteRouter.declineInvitation,
  leaveBand: bandInviteRouter.leaveBand,
  getPendingInvites: bandInviteRouter.getPendingInvites,
  cancelPendingInvite: bandInviteRouter.cancelPendingInvite,

  // Matching
  getRecommendedUsers: bandMatchingRouter.getRecommendedUsers,
  getRecommendedBands: bandMatchingRouter.getRecommendedBands,

  // Members
  getMembers: getMembers,
  getMemberProfile: getMemberProfile,
  changeRole: changeRole,
  proposeRemoval: proposeRemoval,
  transferOwnership: transferOwnership,
  nominateAsFounder: nominateAsFounder,

  // Billing
  getBillingInfo: bandBillingRouter.getBillingInfo,
  createCheckoutSession: bandBillingRouter.createCheckoutSession,
  createPortalSession: bandBillingRouter.createPortalSession,
  claimBillingOwnership: bandBillingRouter.claimBillingOwnership,
  transferBillingOwnership: bandBillingRouter.transferBillingOwnership,
  getPaymentStatus: bandBillingRouter.getPaymentStatus,
  getBillingOwnerCandidates: bandBillingRouter.getBillingOwnerCandidates,
  getMyStanding: bandBillingRouter.getMyStanding,

  // Dissolution
  canDissolve: bandDissolveRouter.canDissolve,
  dissolve: bandDissolveRouter.dissolve,
  createDissolutionProposal: bandDissolveRouter.createDissolutionProposal,
  getArchivedBands: bandDissolveRouter.getArchivedBands,
  getArchivedBandDetails: bandDissolveRouter.getArchivedBandDetails,

  // Governance
  getGovernanceSettings: bandGovernanceRouter.getGovernanceSettings,
  updateGovernanceSettings: bandGovernanceRouter.updateGovernanceSettings,

  // Update
  updateDetails: bandUpdateRouter.updateDetails,

  // AI Instructions
  listAIInstructions: bandAIInstructionRouter.list,
  createAIInstruction: bandAIInstructionRouter.create,
  toggleAIInstruction: bandAIInstructionRouter.toggle,
  deleteAIInstruction: bandAIInstructionRouter.delete,

  // Website Integration
  getWebsiteSettings: bandWebsiteRouter.getWebsiteSettings,
  updateWebsiteSettings: bandWebsiteRouter.updateWebsiteSettings,
  generateApiKey: bandWebsiteRouter.generateApiKey,
  generateWebhookSecret: bandWebsiteRouter.generateWebhookSecret,
  sendStatusUpdate: bandWebsiteRouter.sendStatusUpdate,
})