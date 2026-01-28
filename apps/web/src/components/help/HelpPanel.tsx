'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { jwtDecode } from 'jwt-decode'
import { trpc } from '@/lib/trpc'
import { Spinner } from '@/components/ui'

const CATEGORY_LABELS: Record<string, string> = {
  GETTING_STARTED: 'Getting Started',
  BANDS: 'Bands',
  PROPOSALS: 'Proposals',
  DISCUSSIONS: 'Discussions',
  BILLING: 'Billing',
  ACCOUNT: 'Account',
}

const SOURCE_LABELS: Record<string, string> = {
  FAQ: 'From FAQ',
  CACHE: 'AI Answer',
  AI: 'AI Answer',
  RATE_LIMITED: 'Limit Reached',
}

export function HelpPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'ask' | 'faq'>('ask')
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [answer, setAnswer] = useState<{
    text: string
    source: string
    interactionId: string
    category: string | null
    remaining: number | null
  } | null>(null)
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  // Get userId from token
  useEffect(() => {
    try {
      const token = localStorage.getItem('accessToken')
      if (token) {
        const decoded: any = jwtDecode(token)
        setUserId(decoded.userId)
      }
    } catch {
      // Not logged in - help still works for FAQ browsing
    }
  }, [])

  // Close panel on navigation
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  // FAQ query
  const { data: faqData } = trpc.help.getFaq.useQuery(undefined, {
    enabled: isOpen,
  })

  // Rate limit query
  const { data: rateLimitData } = trpc.help.getRateLimit.useQuery(
    { userId: userId! },
    { enabled: isOpen && !!userId }
  )

  // Ask mutation
  const askMutation = trpc.help.ask.useMutation({
    onSuccess: (data) => {
      setAnswer({
        text: data.answer,
        source: data.source,
        interactionId: data.interactionId,
        category: data.category,
        remaining: data.remaining,
      })
      setFeedbackGiven(null)
    },
  })

  // Feedback mutation
  const feedbackMutation = trpc.help.feedback.useMutation({
    onSuccess: () => {
      // feedback saved silently
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim() || !userId || askMutation.isPending) return

    askMutation.mutate({
      userId,
      question: question.trim(),
      currentPage: pathname,
    })
  }

  const handleFaqClick = (faqAnswer: string) => {
    setAnswer({
      text: faqAnswer,
      source: 'FAQ',
      interactionId: '',
      category: null,
      remaining: null,
    })
    setActiveTab('ask')
    setFeedbackGiven(null)
  }

  const handleFeedback = (wasHelpful: boolean) => {
    if (!answer?.interactionId) return
    setFeedbackGiven(wasHelpful)
    feedbackMutation.mutate({
      interactionId: answer.interactionId,
      wasHelpful,
    })
  }

  const handleClear = () => {
    setQuestion('')
    setAnswer(null)
    setFeedbackGiven(null)
    inputRef.current?.focus()
  }

  // Group FAQ entries by category
  const faqByCategory: Record<string, Array<{ question: string; answer: string }>> = {}
  if (faqData) {
    for (const entry of faqData) {
      if (!faqByCategory[entry.category]) {
        faqByCategory[entry.category] = []
      }
      faqByCategory[entry.category].push({
        question: entry.question,
        answer: entry.answer,
      })
    }
  }

  // Don't show on login/register pages
  if (pathname === '/login' || pathname === '/register') {
    return null
  }

  return (
    <>
      {/* Floating Help Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-white text-xl font-bold transition-all duration-200 ${
          isOpen
            ? 'bg-gray-600 hover:bg-gray-700 rotate-45'
            : 'bg-blue-600 hover:bg-blue-700 hover:scale-110'
        }`}
        aria-label={isOpen ? 'Close help' : 'Open help'}
        title={isOpen ? 'Close help' : 'Need help?'}
      >
        {isOpen ? '+' : '?'}
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-20 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Slide-in Panel */}
      <div
        ref={panelRef}
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b bg-blue-50">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Help Center</h2>
            {userId && rateLimitData && (
              <p className="text-xs text-gray-500 mt-0.5">
                {rateLimitData.remaining} AI questions remaining today
              </p>
            )}
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-gray-600 p-1"
            aria-label="Close help panel"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('ask')}
            className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === 'ask'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Ask a Question
          </button>
          <button
            onClick={() => setActiveTab('faq')}
            className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === 'faq'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Browse FAQ
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'ask' && (
            <div className="p-5">
              {/* Question Form */}
              <form onSubmit={handleSubmit} className="mb-4">
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="How do I create a proposal?"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    maxLength={500}
                    disabled={!userId || askMutation.isPending}
                  />
                  <button
                    type="submit"
                    disabled={!question.trim() || !userId || askMutation.isPending}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {askMutation.isPending ? (
                      <Spinner size="sm" className="border-white" />
                    ) : (
                      'Ask'
                    )}
                  </button>
                </div>
                {!userId && (
                  <p className="text-xs text-gray-400 mt-1.5">
                    Log in to ask questions. You can still browse the FAQ.
                  </p>
                )}
              </form>

              {/* Error */}
              {askMutation.isError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">
                    Something went wrong. Please try again.
                  </p>
                </div>
              )}

              {/* Answer */}
              {answer && (
                <div className="bg-gray-50 rounded-lg border border-gray-200">
                  {/* Source badge */}
                  <div className="px-4 pt-3 pb-1">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      answer.source === 'FAQ'
                        ? 'bg-green-100 text-green-700'
                        : answer.source === 'RATE_LIMITED'
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {SOURCE_LABELS[answer.source] || answer.source}
                    </span>
                  </div>

                  {/* Answer text */}
                  <div className="px-4 py-2 text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                    {answer.text}
                  </div>

                  {/* Feedback */}
                  {answer.interactionId && (
                    <div className="px-4 py-3 border-t border-gray-200">
                      {feedbackGiven === null ? (
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-500">Was this helpful?</span>
                          <button
                            onClick={() => handleFeedback(true)}
                            className="text-gray-400 hover:text-green-600 transition-colors"
                            title="Yes, helpful"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleFeedback(false)}
                            className="text-gray-400 hover:text-red-600 transition-colors"
                            title="No, not helpful"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500">
                          {feedbackGiven ? 'Thanks for the feedback!' : 'Sorry about that. We\'ll improve.'}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Rate limit remaining */}
                  {answer.remaining !== null && answer.remaining <= 5 && (
                    <div className="px-4 pb-3">
                      <p className="text-xs text-orange-600">
                        {answer.remaining} AI questions remaining today
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Clear / Ask another */}
              {answer && (
                <button
                  onClick={handleClear}
                  className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Ask another question
                </button>
              )}

              {/* Quick suggestions */}
              {!answer && !askMutation.isPending && (
                <div className="mt-4">
                  <p className="text-xs text-gray-400 uppercase font-medium mb-2">Common questions</p>
                  <div className="space-y-1.5">
                    {[
                      'How do I create a band?',
                      'How does voting work?',
                      'What are the different roles?',
                      'How do I pay my dues?',
                    ].map((q) => (
                      <button
                        key={q}
                        onClick={() => {
                          setQuestion(q)
                          if (userId) {
                            askMutation.mutate({
                              userId,
                              question: q,
                              currentPage: pathname,
                            })
                          }
                        }}
                        disabled={!userId}
                        className="block w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'faq' && (
            <div className="p-5">
              {Object.entries(faqByCategory).length === 0 ? (
                <div className="text-center py-8">
                  <Spinner size="sm" />
                  <p className="text-sm text-gray-500 mt-2">Loading FAQ...</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {Object.entries(faqByCategory).map(([category, entries]) => (
                    <div key={category} className="border border-gray-200 rounded-lg overflow-hidden">
                      {/* Category header */}
                      <button
                        onClick={() =>
                          setExpandedCategory(
                            expandedCategory === category ? null : category
                          )
                        }
                        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <span className="text-sm font-medium text-gray-800">
                          {CATEGORY_LABELS[category] || category}
                        </span>
                        <svg
                          className={`w-4 h-4 text-gray-500 transition-transform ${
                            expandedCategory === category ? 'rotate-180' : ''
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {/* Questions */}
                      {expandedCategory === category && (
                        <div className="divide-y divide-gray-100">
                          {entries.map((entry, i) => (
                            <button
                              key={i}
                              onClick={() => handleFaqClick(entry.answer)}
                              className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors"
                            >
                              <p className="text-sm text-gray-700">{entry.question}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
