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