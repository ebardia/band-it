import { router } from '../../trpc'
import {
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  archiveCategory,
  unarchiveCategory,
  deleteCategory,
} from './posts.category'
import {
  listPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  togglePinPost,
  toggleLockPost,
} from './posts.post'
import {
  createResponse,
  updateResponse,
  deleteResponse,
} from './posts.response'

export const postsRouter = router({
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
export { canAccessPostCategory, createDefaultCategories } from './posts.category'
