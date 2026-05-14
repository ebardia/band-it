import { router } from '../../trpc'
import { getHomeFeed } from './newspaper.query'

export const newspaperRouter = router({
  getHomeFeed,
})
