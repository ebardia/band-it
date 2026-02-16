import { router } from '../../trpc'
import {
  listFolders,
  getFolder,
  createFolder,
  updateFolder,
  deleteFolder,
  reorderFolders,
} from './documents.folder'
import {
  listDocuments,
  getDocument,
  uploadDocument,
  updateDocument,
  deleteDocument,
  togglePin,
  incrementDownload,
} from './documents.document'

export const documentsRouter = router({
  // Folders
  listFolders,
  getFolder,
  createFolder,
  updateFolder,
  deleteFolder,
  reorderFolders,

  // Documents
  listDocuments,
  getDocument,
  uploadDocument,
  updateDocument,
  deleteDocument,
  togglePin,
  incrementDownload,
})

// Re-export helpers
export { canAccessDocumentFolder, canManageDocuments } from './documents.folder'
