export const theme = {
  // Colors
  colors: {
    // Brand colors
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
    },
    secondary: {
      50: '#f5f3ff',
      100: '#ede9fe',
      500: '#8b5cf6',
      600: '#7c3aed',
      700: '#6d28d9',
    },
    success: {
      50: '#f0fdf4',
      100: '#dcfce7',
      500: '#10b981',
      600: '#059669',
      700: '#047857',
    },
    danger: {
      50: '#fef2f2',
      100: '#fee2e2',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
    },
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
    },
    // Neutral colors
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
    },
  },

  // Typography
  fonts: {
    body: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    heading: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    mono: 'JetBrains Mono, monospace',
  },

  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
  },

  // Spacing
  spacing: {
    xs: '0.25rem',   // 4px
    sm: '0.5rem',    // 8px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    '2xl': '3rem',   // 48px
  },

  // Border radius
  radius: {
    sm: '0.25rem',   // 4px
    md: '0.5rem',    // 8px
    lg: '0.75rem',   // 12px
    xl: '1rem',      // 16px
    '2xl': '1.5rem', // 24px
    full: '9999px',
  },

  // Shadows
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
  },

  // Component styles
  components: {
    // Button variants
    button: {
      primary: {
        base: 'bg-blue-600 text-white font-semibold transition',
        hover: 'hover:bg-blue-700',
        disabled: 'disabled:opacity-50 disabled:cursor-not-allowed',
        sizes: {
          xs: 'px-2 py-1 text-xs rounded-md',
          sm: 'px-3 py-1.5 text-sm rounded-lg',
          md: 'px-4 py-3 text-base rounded-lg',
          lg: 'px-8 py-4 text-lg rounded-lg',
          xl: 'px-10 py-5 text-xl rounded-lg',
        }
      },
      secondary: {
        base: 'bg-white text-blue-600 border-2 border-blue-600 font-semibold transition',
        hover: 'hover:bg-blue-50',
        disabled: 'disabled:opacity-50 disabled:cursor-not-allowed',
        sizes: {
          xs: 'px-2 py-1 text-xs rounded-md',
          sm: 'px-3 py-1.5 text-sm rounded-lg',
          md: 'px-4 py-3 text-base rounded-lg',
          lg: 'px-8 py-4 text-lg rounded-lg',
          xl: 'px-10 py-5 text-xl rounded-lg',
        }
      },
      danger: {
        base: 'bg-red-600 text-white font-semibold transition',
        hover: 'hover:bg-red-700',
        disabled: 'disabled:opacity-50 disabled:cursor-not-allowed',
        sizes: {
          xs: 'px-2 py-1 text-xs rounded-md',
          sm: 'px-3 py-1.5 text-sm rounded-lg',
          md: 'px-4 py-3 text-base rounded-lg',
          lg: 'px-8 py-4 text-lg rounded-lg',
          xl: 'px-10 py-5 text-xl rounded-lg',
        }
      },
      ghost: {
        base: 'bg-transparent text-gray-700 font-semibold transition',
        hover: 'hover:bg-gray-100',
        disabled: 'disabled:opacity-50 disabled:cursor-not-allowed',
        sizes: {
          xs: 'px-2 py-1 text-xs rounded-md',
          sm: 'px-3 py-1.5 text-sm rounded-lg',
          md: 'px-4 py-3 text-base rounded-lg',
          lg: 'px-8 py-4 text-lg rounded-lg',
          xl: 'px-10 py-5 text-xl rounded-lg',
        }
      },
      warning: {
        base: 'bg-yellow-500 text-white font-semibold transition',
        hover: 'hover:bg-yellow-600',
        disabled: 'disabled:opacity-50 disabled:cursor-not-allowed',
        sizes: {
          xs: 'px-2 py-1 text-xs rounded-md',
          sm: 'px-3 py-1.5 text-sm rounded-lg',
          md: 'px-4 py-3 text-base rounded-lg',
          lg: 'px-8 py-4 text-lg rounded-lg',
          xl: 'px-10 py-5 text-xl rounded-lg',
        }
      },
      success: {
        base: 'bg-green-600 text-white font-semibold transition',
        hover: 'hover:bg-green-700',
        disabled: 'disabled:opacity-50 disabled:cursor-not-allowed',
        sizes: {
          xs: 'px-2 py-1 text-xs rounded-md',
          sm: 'px-3 py-1.5 text-sm rounded-lg',
          md: 'px-4 py-3 text-base rounded-lg',
          lg: 'px-8 py-4 text-lg rounded-lg',
          xl: 'px-10 py-5 text-xl rounded-lg',
        }
      }
    },

    // Form inputs
    input: {
      base: 'w-full px-4 py-3 border border-gray-300 rounded-lg outline-none transition',
      focus: 'focus:ring-2 focus:ring-blue-500 focus:border-transparent',
      error: 'border-red-500 focus:ring-red-500',
      disabled: 'disabled:bg-gray-100 disabled:cursor-not-allowed',
    },

    // Cards
    card: {
      base: 'bg-white rounded-2xl shadow-xl p-8',
      hover: 'hover:shadow-2xl transition',
    },

    // Navigation
    nav: {
      container: 'bg-white border-b border-gray-200 px-4 py-3',
      link: 'text-gray-700 hover:text-blue-600 font-medium transition',
      activeLink: 'text-blue-600 font-semibold',
    },

    // Breadcrumb
    breadcrumb: {
      container: 'flex items-center gap-2 text-sm',
      link: 'text-gray-600 hover:text-blue-600 transition',
      separator: 'text-gray-400',
      current: 'text-gray-900 font-medium',
    },

    // Badge/Status
    badge: {
      success: 'bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold',
      warning: 'bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-semibold',
      danger: 'bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-semibold',
      info: 'bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-semibold',
      neutral: 'bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-semibold',
      secondary: 'bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-semibold',
    },

    // Progress indicator
    progress: {
      container: 'flex items-center justify-center gap-2',
      stepComplete: 'w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold',
      stepActive: 'w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold',
      stepInactive: 'w-8 h-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center text-sm font-bold',
      lineComplete: 'w-16 h-1 bg-green-500',
      lineIncomplete: 'w-16 h-1 bg-gray-300',
    },

    // Alert/Notice boxes
    alert: {
      info: 'p-4 bg-blue-50 border border-blue-200 rounded-lg',
      success: 'p-4 bg-green-50 border border-green-200 rounded-lg',
      warning: 'p-4 bg-yellow-50 border border-yellow-200 rounded-lg',
      danger: 'p-4 bg-red-50 border border-red-200 rounded-lg',
    },

    // Dropdown (NEW)
    dropdown: {
      wrapper: 'relative',
      trigger: 'flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 transition',
      menu: 'absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50',
      item: 'w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition',
    },
    
    notificationBell: {
      button: 'relative p-2 text-yellow-400 hover:text-yellow-500 transition',
      badge: 'absolute top-0 right-0 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-600 rounded-full',
    },

    notificationDropdown: {
      container: 'fixed top-16 right-2 left-2 sm:left-auto sm:absolute sm:right-0 sm:top-auto mt-2 sm:w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-y-auto',
      header: 'sticky top-0 bg-white border-b border-gray-200 p-4',
      item: {
        base: 'w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50 transition',
        unread: 'bg-blue-50',
      },
      unreadDot: 'w-2 h-2 bg-blue-600 rounded-full',
      empty: 'p-8 text-center',
      footer: 'sticky bottom-0 bg-white border-t border-gray-200 p-4',
    }
  }
}

// Utility function to combine classes
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}