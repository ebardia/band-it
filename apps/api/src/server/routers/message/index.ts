import { router } from '../../trpc'
import { listMessages, getThread, searchMessages } from './message.query'
import { createMessage, markAsRead } from './message.create'
import { editMessage, deleteMessage, pinMessage, unpinMessage, getEditHistory } from './message.update'
import { toggleReaction, getReactions, getReactionsBatch } from './message.reaction'
import { advancedSearch } from './message.search'
import { getMentionableUsers } from './message.mention'

export const messageRouter = router({
  // Read
  list: listMessages,
  getThread: getThread,
  search: searchMessages,
  getEditHistory: getEditHistory,

  // Create
  create: createMessage,
  markAsRead: markAsRead,

  // Update
  edit: editMessage,
  delete: deleteMessage,
  pin: pinMessage,
  unpin: unpinMessage,

  // Reactions
  toggleReaction: toggleReaction,
  getReactions: getReactions,
  getReactionsBatch: getReactionsBatch,

  // Search
  advancedSearch: advancedSearch,

  // Mentions
  getMentionableUsers: getMentionableUsers,
})
