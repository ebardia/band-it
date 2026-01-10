'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { jwtDecode } from 'jwt-decode'

export default function VerifyEmailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [email, setEmail] = useState<string>('')
  const [userId, setUserId] = useState<string>('')
  const [verifying, setVerifying] = useState(false)

  // Get email and userId from localStorage
  useEffect(() => {
    const storedEmail = localStorage.getItem('userEmail') || ''
    setEmail(storedEmail)

    const accessToken = localStorage.getItem('accessToken')
    if (accessToken) {
      try {
        const decoded: any = jwtDecode(accessToken)
        setUserId(decoded.userId)
      } catch (error) {
        console.error('Invalid token:', error)
      }
    }
  }, [])

  // Verify email mutation
  const verifyEmailMutation = trpc.auth.verifyEmail.useMutation({
    onSuccess: () => {
      setVerifying(false)
      // Redirect to profile completion
      setTimeout(() => {
        router.push('/profile')
      }, 2000)
    },
    onError: (error) => {
      setVerifying(false)
      alert(`Verification failed: ${error.message}`)
    },
  })

  // Resend email mutation
  const resendMutation = trpc.auth.resendVerification.useMutation({
    onSuccess: () => {
      alert('Verification email sent! Check your inbox.')
    },
    onError: (error) => {
      alert(`Error: ${error.message}`)
    },
  })

  // If token is present in URL, verify it
  useEffect(() => {
    if (token && !verifying) {
      setVerifying(true)
      verifyEmailMutation.mutate({ token })
    }
  }, [token])

  const handleResend = () => {
    if (userId) {
      resendMutation.mutate({ userId })
    }
  }

  // If verifying with token
  if (token) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            {verifying && !verifyEmailMutation.isError ? (
              <div className="text-center">
                <div className="mb-6">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Verifying Email...
                </h1>
                <p className="text-gray-600">
                  Please wait
                </p>
              </div>
            ) : verifyEmailMutation.isSuccess ? (
              <div className="text-center">
                <div className="mb-6">
                  <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                  Email Verified! ✅
                </h1>
                <p className="text-gray-600">
                  Redirecting to profile completion...
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </main>
    )
  }

  // Initial state - waiting for verification
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Check Your Email
            </h1>
            <p className="text-gray-600">
              We've sent a verification link to
            </p>
            <p className="font-semibold text-gray-900 mt-1">
              {email}
            </p>
          </div>

          {/* Progress */}
          <div className="mb-8">
            <div className="flex items-center justify-center gap-2">
              <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                ✓
              </div>
              <div className="w-16 h-1 bg-green-500"></div>
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                2
              </div>
              <div className="w-16 h-1 bg-gray-300"></div>
              <div className="w-8 h-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center text-sm font-bold">
                3
              </div>
              <div className="w-16 h-1 bg-gray-300"></div>
              <div className="w-8 h-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center text-sm font-bold">
                4
              </div>
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-600">
              <span>Register</span>
              <span className="font-bold text-blue-600">Verify</span>
              <span>Profile</span>
              <span>Payment</span>
            </div>
          </div>

          {/* Instructions */}
          <div className="p-4 bg-blue-50 rounded-lg mb-6">
            <p className="text-sm text-gray-700 mb-2">
              <strong>Next steps:</strong>
            </p>
            <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
              <li>Open your email inbox</li>
              <li>Click the verification link</li>
              <li>Complete your profile</li>
            </ol>
          </div>

          {/* Resend Button */}
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-3">
              Didn't receive the email?
            </p>
            <button
              onClick={handleResend}
              disabled={resendMutation.isPending}
              className="text-blue-600 hover:text-blue-700 font-semibold text-sm disabled:opacity-50"
            >
              {resendMutation.isPending ? 'Sending...' : 'Resend verification email'}
            </button>
          </div>

          {/* Development Note */}
          <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-800">
              <strong>Development Mode:</strong> Check your terminal/console for the verification link.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}