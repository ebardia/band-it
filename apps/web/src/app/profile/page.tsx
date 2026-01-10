'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { jwtDecode } from 'jwt-decode'

export default function ProfilePage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    zipcode: '',
    strengths: '',
    weaknesses: '',
    passions: '',
    developmentPath: '',
  })

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

  const updateProfileMutation = trpc.auth.updateProfile.useMutation({
    onSuccess: (data) => {
      console.log('Profile updated:', data)
      alert('Profile saved! Next: Payment setup')
      router.push('/payment')
    },
    onError: (error) => {
      alert(`Error: ${error.message}`)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!userId) {
      alert('User not found. Please register again.')
      router.push('/register')
      return
    }

    updateProfileMutation.mutate({
      userId,
      ...formData,
    })
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="w-full max-w-2xl">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Complete Your Profile
            </h1>
            <p className="text-gray-600">
              Tell us about yourself so we can help you grow
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
              <span className="font-bold text-blue-600">Profile</span>
              <span>Payment</span>
              <span>Verify</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Zipcode */}
            <div>
              <label
                htmlFor="zipcode"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Zipcode <span className="text-red-500">*</span>
              </label>
              <input
                id="zipcode"
                type="text"
                required
                value={formData.zipcode}
                onChange={(e) =>
                  setFormData({ ...formData, zipcode: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                placeholder="12345"
                maxLength={5}
                pattern="[0-9]{5}"
              />
            </div>

            {/* Strengths */}
            <div>
              <label
                htmlFor="strengths"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Your Strengths <span className="text-red-500">*</span>
              </label>
              <textarea
                id="strengths"
                required
                value={formData.strengths}
                onChange={(e) =>
                  setFormData({ ...formData, strengths: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                placeholder="Example: Leadership, communication, guitar playing, event planning..."
                rows={3}
              />
              <p className="mt-1 text-xs text-gray-500">
                Separate with commas
              </p>
            </div>

            {/* Weaknesses */}
            <div>
              <label
                htmlFor="weaknesses"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Areas for Improvement <span className="text-red-500">*</span>
              </label>
              <textarea
                id="weaknesses"
                required
                value={formData.weaknesses}
                onChange={(e) =>
                  setFormData({ ...formData, weaknesses: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                placeholder="Example: Time management, public speaking, music theory..."
                rows={3}
              />
              <p className="mt-1 text-xs text-gray-500">
                Separate with commas
              </p>
            </div>

            {/* Passions */}
            <div>
              <label
                htmlFor="passions"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Your Passions <span className="text-red-500">*</span>
              </label>
              <textarea
                id="passions"
                required
                value={formData.passions}
                onChange={(e) =>
                  setFormData({ ...formData, passions: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                placeholder="Example: Rock music, community building, teaching, performing..."
                rows={3}
              />
              <p className="mt-1 text-xs text-gray-500">
                Separate with commas
              </p>
            </div>

            {/* Development Path */}
            <div>
              <label
                htmlFor="developmentPath"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                What Do You Want to Learn? <span className="text-red-500">*</span>
              </label>
              <textarea
                id="developmentPath"
                required
                value={formData.developmentPath}
                onChange={(e) =>
                  setFormData({ ...formData, developmentPath: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                placeholder="Example: Advanced guitar techniques, band management, marketing, fundraising..."
                rows={3}
              />
              <p className="mt-1 text-xs text-gray-500">
                Separate with commas
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={updateProfileMutation.isPending || !userId}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updateProfileMutation.isPending ? 'Saving...' : 'Continue to Payment'}
            </button>
          </form>

          {/* Skip Link */}
          <div className="mt-4 text-center">
            <button
              onClick={() => router.push('/payment')}
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