import { prisma } from '../lib/prisma'
import { NotificationType } from '@prisma/client'

const templates = [
  // Band Invitations
  {
    type: NotificationType.BAND_INVITE_RECEIVED,
    title: 'Band Invitation',
    message: '{inviterName} invited you to join {bandName}',
    emailSubject: 'You\'ve been invited to join {bandName}',
    emailBody: 'Hi {userName},\n\n{inviterName} has invited you to join {bandName}.\n\nClick the link below to accept or decline:\n{actionUrl}',
  },
  {
    type: NotificationType.BAND_INVITE_ACCEPTED,
    title: 'Invitation Accepted',
    message: '{userName} accepted your invitation to join {bandName}',
    emailSubject: '{userName} joined {bandName}',
    emailBody: 'Good news! {userName} has accepted your invitation and joined {bandName}.',
  },
  {
    type: NotificationType.BAND_INVITE_DECLINED,
    title: 'Invitation Declined',
    message: '{userName} declined your invitation to join {bandName}',
    emailSubject: '{userName} declined to join {bandName}',
    emailBody: '{userName} has declined your invitation to join {bandName}.',
  },

  // Band Applications
  {
    type: NotificationType.BAND_APPLICATION_RECEIVED,
    title: 'New Application',
    message: '{userName} applied to join {bandName}',
    emailSubject: 'New application for {bandName}',
    emailBody: 'Hi,\n\n{userName} has applied to join {bandName}.\n\nReview their application:\n{actionUrl}',
  },
  {
    type: NotificationType.BAND_APPLICATION_APPROVED,
    title: 'Application Approved',
    message: 'Your application to join {bandName} was approved!',
    emailSubject: 'Welcome to {bandName}!',
    emailBody: 'Congratulations! Your application to join {bandName} has been approved.\n\nView the band:\n{actionUrl}',
  },
  {
    type: NotificationType.BAND_APPLICATION_REJECTED,
    title: 'Application Not Accepted',
    message: 'Your application to join {bandName} was not accepted',
    emailSubject: 'Application update for {bandName}',
    emailBody: 'Unfortunately, your application to join {bandName} was not accepted at this time.',
  },

  // Band Membership
  {
    type: NotificationType.BAND_MEMBER_JOINED,
    title: 'New Member',
    message: '{userName} joined {bandName}',
    emailSubject: 'New member in {bandName}',
    emailBody: '{userName} has joined {bandName}!',
  },
  {
    type: NotificationType.BAND_MEMBER_LEFT,
    title: 'Member Left',
    message: '{userName} left {bandName}',
    emailSubject: 'Member update in {bandName}',
    emailBody: '{userName} has left {bandName}.',
  },
  {
    type: NotificationType.BAND_STATUS_CHANGED,
    title: 'Band Status Update',
    message: '{bandName} is now {status}',
    emailSubject: '{bandName} status changed to {status}',
    emailBody: 'Good news! {bandName} status has changed to {status}.',
  },

  // Band Updates
  {
    type: NotificationType.BAND_DETAILS_UPDATED,
    title: 'Band Updated',
    message: '{bandName} details have been updated',
    emailSubject: '{bandName} has been updated',
    emailBody: '{bandName} has been updated. Check out the changes:\n{actionUrl}',
  },

  // Proposals
  {
    type: NotificationType.PROPOSAL_CREATED,
    title: 'New Proposal',
    message: '{creatorName} created "{proposalTitle}" in {bandName}',
    emailSubject: 'New proposal in {bandName}',
    emailBody: 'Hi,\n\n{creatorName} has created a new proposal "{proposalTitle}" in {bandName}.\n\nVoting ends: {votingEndsAt}\n\nCast your vote:\n{actionUrl}',
  },
  {
    type: NotificationType.PROPOSAL_VOTE_NEEDED,
    title: 'Vote Needed',
    message: 'Your vote is needed on "{proposalTitle}" in {bandName}',
    emailSubject: 'Your vote is needed in {bandName}',
    emailBody: 'Hi,\n\nThe proposal "{proposalTitle}" in {bandName} needs your vote.\n\nVoting ends: {votingEndsAt}\n\nCast your vote:\n{actionUrl}',
  },
  {
    type: NotificationType.PROPOSAL_APPROVED,
    title: 'Proposal Approved',
    message: '"{proposalTitle}" was approved in {bandName}',
    emailSubject: 'Proposal approved in {bandName}',
    emailBody: 'The proposal "{proposalTitle}" in {bandName} has been approved.',
  },
  {
    type: NotificationType.PROPOSAL_REJECTED,
    title: 'Proposal Rejected',
    message: '"{proposalTitle}" was rejected in {bandName}',
    emailSubject: 'Proposal rejected in {bandName}',
    emailBody: 'The proposal "{proposalTitle}" in {bandName} has been rejected.',
  },
  {
    type: NotificationType.PROPOSAL_CLOSED,
    title: 'Proposal Closed',
    message: '"{proposalTitle}" has been closed',
    emailSubject: 'Proposal closed in {bandName}',
    emailBody: 'The proposal "{proposalTitle}" in {bandName} has been closed.',
  },

  // Billing Notifications
  {
    type: NotificationType.BILLING_PAYMENT_REQUIRED,
    title: 'Payment Required',
    message: '{bandName} now has 3+ members and requires a subscription',
    emailSubject: 'Payment required for {bandName}',
    emailBody: 'Hi,\n\n{bandName} now has 3 or more members and requires an active subscription to remain active.\n\nAs a member, you can claim billing ownership and set up payment:\n{actionUrl}\n\nCurrent monthly rate: ${priceAmount}/month',
  },
  {
    type: NotificationType.BILLING_PAYMENT_SUCCEEDED,
    title: 'Payment Successful',
    message: 'Payment processed for {bandName}',
    emailSubject: 'Payment confirmed for {bandName}',
    emailBody: 'Your payment of ${priceAmount} for {bandName} has been successfully processed.\n\nThank you for keeping {bandName} active!',
  },
  {
    type: NotificationType.BILLING_PAYMENT_FAILED,
    title: 'Payment Failed',
    message: 'Payment failed for {bandName}. Please update your payment method.',
    emailSubject: 'Payment failed for {bandName} - Action Required',
    emailBody: 'Hi,\n\nThe payment for {bandName} has failed. Please update your payment method within {gracePeriodDays} days to avoid band deactivation.\n\nUpdate payment method:\n{actionUrl}',
  },
  {
    type: NotificationType.BILLING_GRACE_PERIOD_WARNING,
    title: 'Grace Period Warning',
    message: '{bandName} will be deactivated in {daysLeft} days if payment is not updated',
    emailSubject: 'Urgent: {bandName} deactivation in {daysLeft} days',
    emailBody: 'Hi,\n\nThis is a reminder that {bandName} will be deactivated in {daysLeft} days due to payment failure.\n\nPlease update your payment method immediately:\n{actionUrl}',
  },
  {
    type: NotificationType.BILLING_BAND_DEACTIVATED,
    title: 'Band Deactivated',
    message: '{bandName} has been deactivated due to payment failure',
    emailSubject: '{bandName} has been deactivated',
    emailBody: 'Hi,\n\n{bandName} has been deactivated due to payment failure. All band activities are now paused.\n\nTo reactivate the band, a billing owner must set up a new subscription:\n{actionUrl}',
  },
  {
    type: NotificationType.BILLING_OWNER_LEFT,
    title: 'Billing Owner Left',
    message: 'The billing owner of {bandName} has left. A new billing owner is needed.',
    emailSubject: 'Billing owner needed for {bandName}',
    emailBody: 'Hi,\n\nThe billing owner of {bandName} has left the band. A new member must claim billing ownership to manage payments.\n\nClaim billing ownership:\n{actionUrl}',
  },
  {
    type: NotificationType.BILLING_OWNER_CLAIMED,
    title: 'Billing Ownership Claimed',
    message: '{newOwnerName} has claimed billing ownership of {bandName}',
    emailSubject: 'Billing owner claimed for {bandName}',
    emailBody: 'Hi,\n\n{newOwnerName} has claimed billing ownership for {bandName} and will be responsible for managing payments.',
  },
  {
    type: NotificationType.BILLING_SUBSCRIPTION_UPGRADED,
    title: 'Subscription Upgraded',
    message: '{bandName} subscription upgraded to {newPlan}',
    emailSubject: 'Subscription upgraded for {bandName}',
    emailBody: 'Hi,\n\n{bandName} has reached 21+ members. Your subscription has been automatically upgraded to the {newPlan} plan at ${priceAmount}/month.',
  },
  {
    type: NotificationType.BILLING_SUBSCRIPTION_DOWNGRADED,
    title: 'Subscription Downgraded',
    message: '{bandName} subscription will downgrade to {newPlan} at billing cycle end',
    emailSubject: 'Subscription downgrade scheduled for {bandName}',
    emailBody: 'Hi,\n\n{bandName} now has fewer than 21 members. Your subscription will be downgraded to the {newPlan} plan at ${priceAmount}/month at the end of the current billing cycle.',
  },

  // Events
  {
    type: NotificationType.EVENT_CREATED,
    title: 'New Event',
    message: '"{eventTitle}" has been scheduled for {eventDate}',
    emailSubject: 'New event in {bandName}',
    emailBody: 'Hi,\n\nA new event "{eventTitle}" has been scheduled in {bandName}.\n\nDate: {eventDate}\nTime: {eventTime}\n\nView event details and RSVP:\n{actionUrl}',
  },
  {
    type: NotificationType.EVENT_UPDATED,
    title: 'Event Updated',
    message: '"{eventTitle}" has been updated',
    emailSubject: 'Event updated in {bandName}',
    emailBody: 'Hi,\n\nThe event "{eventTitle}" in {bandName} has been updated.\n\nPlease check the new details:\n{actionUrl}',
  },
  {
    type: NotificationType.EVENT_CANCELLED,
    title: 'Event Cancelled',
    message: '"{eventTitle}" has been cancelled',
    emailSubject: 'Event cancelled in {bandName}',
    emailBody: 'Hi,\n\nThe event "{eventTitle}" in {bandName} has been cancelled.\n\n{cancellationNote}',
  },
  {
    type: NotificationType.EVENT_REMINDER,
    title: 'Event Reminder',
    message: '"{eventTitle}" is starting in {timeUntil}',
    emailSubject: 'Reminder: {eventTitle} is coming up',
    emailBody: 'Hi,\n\nThis is a reminder that "{eventTitle}" in {bandName} is starting in {timeUntil}.\n\nDate: {eventDate}\nTime: {eventTime}\n\nEvent details:\n{actionUrl}',
  },
  {
    type: NotificationType.EVENT_RSVP_RECEIVED,
    title: 'New RSVP',
    message: '{userName} is going to "{eventTitle}"',
    emailSubject: 'New RSVP for {eventTitle}',
    emailBody: 'Hi,\n\n{userName} has RSVP\'d as going to your event "{eventTitle}" in {bandName}.\n\nView all RSVPs:\n{actionUrl}',
  },
  {
    type: NotificationType.EVENT_ATTENDANCE_MARKED,
    title: 'Attendance Marked',
    message: 'Your attendance for "{eventTitle}" was marked by {markerName}',
    emailSubject: 'Attendance marked for {eventTitle}',
    emailBody: 'Hi,\n\nYour attendance for "{eventTitle}" in {bandName} has been marked by {markerName}.\n\nView event:\n{actionUrl}',
  },
]

export async function seedNotificationTemplates() {
  console.log('Seeding notification templates...')

  for (const template of templates) {
    await prisma.notificationTemplate.upsert({
      where: { type: template.type },
      update: template,
      create: template,
    })
  }

  console.log(`Seeded ${templates.length} notification templates`)
}

// Run if executed directly
if (require.main === module) {
  seedNotificationTemplates()
    .then(() => {
      console.log('Done!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Error seeding templates:', error)
      process.exit(1)
    })
}