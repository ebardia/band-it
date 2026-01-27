import { router } from '../../trpc'
import { bandCreateRouter } from './band.create'
import { bandQueryRouter } from './band.query'
import { bandApplicationRouter } from './band.application'
import { bandInviteRouter } from './band.invite'
import { bandMatchingRouter } from './band.matching'
import { bandBillingRouter } from './band.billing'
import { bandDissolveRouter } from './band.dissolve'
import { getMembers, getMemberProfile, changeRole, proposeRemoval } from './band.members'

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

  // Members
  getMembers: getMembers,
  getMemberProfile: getMemberProfile,
  changeRole: changeRole,
  proposeRemoval: proposeRemoval,

  // Billing
  getBillingInfo: bandBillingRouter.getBillingInfo,
  createCheckoutSession: bandBillingRouter.createCheckoutSession,
  createPortalSession: bandBillingRouter.createPortalSession,
  claimBillingOwnership: bandBillingRouter.claimBillingOwnership,
  transferBillingOwnership: bandBillingRouter.transferBillingOwnership,
  getPaymentStatus: bandBillingRouter.getPaymentStatus,
  getBillingOwnerCandidates: bandBillingRouter.getBillingOwnerCandidates,

  // Dissolution
  canDissolve: bandDissolveRouter.canDissolve,
  dissolve: bandDissolveRouter.dissolve,
})