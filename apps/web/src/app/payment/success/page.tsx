'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { trpc } from '@/lib/trpc'

export default function PaymentSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [verifying, setVerifying] = useState(true)

  const verifyPaymentMutation = trpc.payment.verifyPayment.useMutation({
    onSuccess: (data) => {
      setVerifying(false)
      if (data.success) {
        // Payment verified! Registration complete - go to home
        setTimeout(() => {
          router.push('/')
        }, 3000)
      }
    },
    onError: (error) => {
      console.error('Verification error:', error)
      setVerifying(false)
    },
  })

  useEffect(() => {
    if (sessionId) {
      verifyPaymentMutation.mutate({ sessionId })
    } else {
      setVerifying(false)
    }
  }, [sessionId])

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {verifying ? (
            /* Verifying */
            <div className="text-center">
              <div className="mb-6">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Verifying Payment...
              </h1>
              <p className="text-gray-600">
                Please wait while we confirm your subscription
              </p>
            </div>
          ) : (
            /* Success */
            <div className="text-center">
              {/* Success Icon */}
              <div className="mb-6">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>

              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Welcome to Band IT! 🎉
              </h1>
              
              <p className="text-gray-600 mb-4">
                Your registration is complete!
              </p>

              {/* Progress - All Complete */}
              <div className="mb-8">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    ✓
                  </div>
                  <div className="w-16 h-1 bg-green-500"></div>
                  <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    ✓
                  </div>
                  <div className="w-16 h-1 bg-green-500"></div>
                  <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    ✓
                  </div>
                  <div className="w-16 h-1 bg-green-500"></div>
                  <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    ✓
                  </div>
                </div>
                <div className="flex justify-between mt-2 text-xs text-gray-600">
                  <span>Register</span>
                  <span>Verify</span>
                  <span>Profile</span>
                  <span>Payment</span>
                </div>
              </div>

              <div className="p-4 bg-green-50 rounded-lg mb-6 space-y-2">
                <p className="text-sm text-gray-700">
                  ✅ Account created
                </p>
                <p className="text-sm text-gray-700">
                  ✅ Email verified
                </p>
                <p className="text-sm text-gray-700">
                  ✅ Profile completed
                </p>
                <p className="text-sm text-gray-700">
                  ✅ Subscription active ($5/month)
                </p>
              </div>

              <p className="text-sm text-gray-500">
                Redirecting to homepage in 3 seconds...
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}