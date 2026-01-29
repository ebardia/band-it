import { useToast } from '@/components/ui'
import { useRouter } from 'next/navigation'

/**
 * Hook to handle DUES_REQUIRED errors from tRPC mutations.
 * Returns an onError handler that can be passed to useMutation options.
 */
export function useDuesErrorHandler(bandSlug?: string) {
  const { showToast } = useToast()
  const router = useRouter()

  return (error: any) => {
    // Check if this is a DUES_REQUIRED error
    const isDuesError =
      error?.data?.cause?.errorCode === 'DUES_REQUIRED' ||
      error?.message?.includes('dues')

    if (isDuesError) {
      showToast('Please pay your dues to perform this action.', 'error')

      // Optionally navigate to billing page
      if (bandSlug) {
        // Could prompt user or auto-navigate
        // router.push(`/bands/${bandSlug}/billing`)
      }

      return true // Handled
    }

    return false // Not handled, let caller handle
  }
}

/**
 * Wrapper for mutation error handlers that checks for DUES_REQUIRED first.
 */
export function withDuesErrorHandling(
  handleDuesError: (error: any) => boolean,
  fallbackHandler?: (error: any) => void
) {
  return (error: any) => {
    if (handleDuesError(error)) {
      return // Dues error was handled
    }

    // Call fallback handler if provided
    if (fallbackHandler) {
      fallbackHandler(error)
    }
  }
}
