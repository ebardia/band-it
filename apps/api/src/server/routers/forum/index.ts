import { router } from '../../trpc'
import {
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  archiveCategory,
  unarchiveCategory,
  deleteCategory,
} from './forum.category'
import {
  listPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  togglePinPost,
  toggleLockPost,
} from './forum.post'
import {
  createResponse,
  updateResponse,
  deleteResponse,
} from './forum.response'

export const forumRouter = router({
  // Categories
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  archiveCategory,
  unarchiveCategory,
  deleteCategory,

  // Posts
  listPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  togglePinPost,
  toggleLockPost,

  // Responses
  createResponse,
  updateResponse,
  deleteResponse,
})

// Re-export helpers
export { canAccessForumCategory, createDefaultCategories } from './forum.category'
