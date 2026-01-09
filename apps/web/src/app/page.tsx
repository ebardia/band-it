'use client'

import Image from "next/image"
import { trpc } from "@/lib/trpc"

export default function HomePage() {
  // Test API call
  const { data, isLoading } = trpc.test.hello.useQuery({ name: 'Band IT' })
  const healthQuery = trpc.test.health.useQuery()

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="text-center">
        {/* Logo */}
        <div className="mb-16 flex justify-center">
          <Image 
            src="/logo.png" 
            alt="Band IT Logo" 
            width={600} 
            height={600}
            className="drop-shadow-2xl"
            priority
          />
        </div>

        {/* API Test - Shows connection works */}
        <div className="mb-8 p-6 bg-white/80 backdrop-blur-sm rounded-lg shadow-lg max-w-md mx-auto">
          <h3 className="text-lg font-bold mb-2 text-gray-800">API Connection Test</h3>
          {isLoading ? (
            <p className="text-gray-600">Loading...</p>
          ) : (
            <div className="space-y-2 text-left">
              <p className="text-sm text-gray-700">
                <strong>Message:</strong> {data?.greeting}
              </p>
              <p className="text-sm text-gray-700">
                <strong>Backend Status:</strong> {healthQuery.data?.status}
              </p>
              <p className="text-sm text-green-600 font-semibold">
                ✅ Frontend ↔️ Backend Connected!
              </p>
            </div>
          )}
        </div>
        
        {/* Buttons */}
        <div className="flex gap-4 justify-center">
          <button className="px-8 py-4 bg-blue-600 text-white text-lg rounded-lg hover:bg-blue-700 transition shadow-lg">
            Get Started
          </button>
          <button className="px-8 py-4 bg-white text-blue-600 border-2 border-blue-600 text-lg rounded-lg hover:bg-blue-50 transition shadow-lg">
            Learn More
          </button>
        </div>
      </div>
    </main>
  )
}