import Link from 'next/link'

export function Footer() {
  return (
    <footer className="w-full border-t border-gray-200 bg-white py-3 px-3 md:py-4 md:px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-2 md:gap-4">
          <p className="text-xs md:text-sm text-gray-500 text-center md:text-left">
            © {new Date().getFullYear()} BAND IT • Tools for collective decision-making and action
          </p>
          <nav className="flex flex-wrap items-center justify-center gap-3 md:gap-5 text-xs md:text-sm">
            <Link
              href="/community-guidelines"
              className="text-gray-500 hover:text-gray-700 hover:underline"
            >
              Community Guidelines
            </Link>
            <Link
              href="/terms"
              className="text-gray-500 hover:text-gray-700 hover:underline"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="text-gray-500 hover:text-gray-700 hover:underline"
            >
              Privacy
            </Link>
            <Link
              href="/contact"
              className="text-gray-500 hover:text-gray-700 hover:underline"
            >
              Contact
            </Link>
            <Link
              href="/ai-usage"
              className="text-gray-500 hover:text-gray-700 hover:underline"
            >
              AI Usage
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  )
}
