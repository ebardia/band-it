import { router } from '../../trpc'
import { listChannels, getChannel, getUnreadCounts } from './channel.query'
import { createChannel } from './channel.create'
import { updateChannel, archiveChannel, unarchiveChannel, deleteChannel } from './channel.update'

export const channelRouter = router({
  // Read
  list: listChannels,
  get: getChannel,
  getUnreadCounts: getUnreadCounts,

  // Create
  create: createChannel,

  // Update
  update: updateChannel,
  archive: archiveChannel,
  unarchive: unarchiveChannel,
  delete: deleteChannel,
})

// Re-export helper for creating default channel
export { createDefaultChannel } from './channel.create'
export { canAccessChannel } from './channel.query'
