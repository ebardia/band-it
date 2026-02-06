import Link from 'next/link'

export function Footer() {
  return (
    <footer className="w-full border-t border-gray-200 bg-white py-6 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            Band It - The Power of Collective
          </p>
          <nav className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
            <Link
              href="/community-guidelines"
              className="text-sm text-gray-500 hover:text-gray-700 hover:underline"
            >
              Community Guidelines
            </Link>
            <Link
              href="/terms"
              className="text-sm text-gray-500 hover:text-gray-700 hover:underline"
            >
              Terms of Service
            </Link>
            <Link
              href="/privacy"
              className="text-sm text-gray-500 hover:text-gray-700 hover:underline"
            >
              Privacy Policy
            </Link>
            <Link
              href="/contact"
              className="text-sm text-gray-500 hover:text-gray-700 hover:underline"
            >
              Contact Us
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  )
}
