'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { jwtDecode } from 'jwt-decode'

export default function PaymentPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)

  // Get userId from token
  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      try {
        const decoded: any = jwtDecode(token)
        setUserId(decoded.userId)
      } catch (error) {
        console.error('Invalid token:', error)
        router.push('/register')
      }
    } else {
      router.push('/register')
    }
  }, [router])

  const createCheckoutMutation = trpc.payment.createCheckoutSession.useMutation({
    onSuccess: (data) => {
      // Redirect to Stripe checkout
      if (data.url) {
        window.location.href = data.url
      }
    },
    onError: (error) => {
      alert(`Error: ${error.message}`)
    },
  })

  const handlePayment = () => {
    if (!userId) {
      alert('User not found. Please register again.')
      router.push('/register')
      return
    }

    createCheckoutMutation.mutate({ userId })
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Subscribe to Band IT
            </h1>
            <p className="text-gray-600">
              Complete your registration with a monthly membership
            </p>
          </div>

          {/* Progress */}
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
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                3
              </div>
              <div className="w-16 h-1 bg-gray-300"></div>
              <div className="w-8 h-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center text-sm font-bold">
                4
              </div>
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-600">
              <span>Register</span>
              <span>Profile</span>
              <span className="font-bold text-blue-600">Payment</span>
              <span>Verify</span>
            </div>
          </div>

          {/* Pricing */}
          <div className="mb-8 p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl">
            <div className="text-center">
              <div className="text-5xl font-bold text-gray-900 mb-2">
                $5
                <span className="text-2xl text-gray-600">/month</span>
              </div>
              <p className="text-gray-600 mb-6">
                Band IT Membership
              </p>
              
              {/* Features */}
              <ul className="text-left space-y-3">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 text-lg">✓</span>
                  <span className="text-sm text-gray-700">Create and join unlimited bands</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 text-lg">✓</span>
                  <span className="text-sm text-gray-700">Participate in band governance</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 text-lg">✓</span>
                  <span className="text-sm text-gray-700">Task management and tracking</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 text-lg">✓</span>
                  <span className="text-sm text-gray-700">Proposal voting system</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 text-lg">✓</span>
                  <span className="text-sm text-gray-700">Community support</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Payment Button */}
          <button
            onClick={handlePayment}
            disabled={createCheckoutMutation.isPending || !userId}
            className="w-full bg-blue-600 text-white py-4 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-lg"
          >
            {createCheckoutMutation.isPending ? 'Loading...' : 'Subscribe Now'}
          </button>

          {/* Secure Payment */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              🔒 Secure payment powered by Stripe
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Cancel anytime
            </p>
          </div>

          {/* Skip Link */}
          <div className="mt-4 text-center">
            <button
              onClick={() => router.push('/')}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Skip for now
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}