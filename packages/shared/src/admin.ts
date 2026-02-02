/**
 * Admin configuration
 * Centralized admin user management
 */

export const ADMIN_CONFIG = {
  emails: ['bardia@ebardia.com'],

  isAdmin: (email: string | null | undefined): boolean => {
    if (!email) return false
    return ADMIN_CONFIG.emails.includes(email.toLowerCase())
  },
}
