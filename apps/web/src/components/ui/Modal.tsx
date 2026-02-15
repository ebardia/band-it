'use client'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | 'full'
  title?: string
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  full: 'max-w-[90vw]',
}

export function Modal({ isOpen, onClose, children, size = 'md', title }: ModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className={`relative bg-white rounded-lg shadow-xl ${sizeClasses[size]} w-full mx-4 my-8 p-6 z-10 max-h-[90vh] overflow-y-auto`}>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-xl font-bold leading-none"
          title="Close"
        >
          ✕
        </button>
        {title && (
          <h2 className="text-xl font-bold text-gray-900 mb-4 pr-8">{title}</h2>
        )}
        {children}
      </div>
    </div>
  )
}