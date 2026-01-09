'use client'

import Image from "next/image"
import Link from "next/link"
import { trpc } from "@/lib/trpc"

export default function HomePage() {
  const { data: helloData, isLoading: helloLoading } = trpc.test.hello.useQuery({ name: 'Band IT' })
  const { data: healthData } = trpc.test.health.useQuery()
  const { data: dbData, isLoading: dbLoading } = trpc.test.dbTest.useQuery()

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

        {/* Connection Tests */}
        <div className="mb-8 p-6 bg-white/80 backdrop-blur-sm rounded-lg shadow-lg max-w-md mx-auto space-y-3">
          <h3 className="text-lg font-bold mb-3 text-gray-800">System Status</h3>
          
          {/* API Test */}
          <div className="text-left p-3 bg-blue-50 rounded">
            <p className="text-sm font-semibold text-gray-700">API Connection</p>
            {helloLoading ? (
              <p className="text-sm text-gray-600">Testing...</p>
            ) : (
              <p className="text-sm text-green-600">✅ {helloData?.greeting}</p>
            )}
          </div>

          {/* Backend Health */}
          <div className="text-left p-3 bg-purple-50 rounded">
            <p className="text-sm font-semibold text-gray-700">Backend Health</p>
            <p className="text-sm text-green-600">✅ {healthData?.status}</p>
          </div>

          {/* Database Test */}
          <div className="text-left p-3 bg-green-50 rounded">
            <p className="text-sm font-semibold text-gray-700">Database Connection</p>
            {dbLoading ? (
              <p className="text-sm text-gray-600">Testing...</p>
            ) : dbData?.status === 'connected' ? (
              <div>
                <p className="text-sm text-green-600">✅ Connected to PostgreSQL</p>
                <p className="text-xs text-gray-600 mt-1">
                  Users: {dbData.users} | Bands: {dbData.bands}
                </p>
              </div>
            ) : (
              <p className="text-sm text-red-600">❌ Connection failed</p>
            )}
          </div>
        </div>
        
        {/* Buttons */}
        <div className="flex gap-4 justify-center">
          <Link href="/register">
            <button className="px-8 py-4 bg-blue-600 text-white text-lg rounded-lg hover:bg-blue-700 transition shadow-lg">
              Get Started
            </button>
          </Link>
          <button className="px-8 py-4 bg-white text-blue-600 border-2 border-blue-600 text-lg rounded-lg hover:bg-blue-50 transition shadow-lg">
            Learn More
          </button>
        </div>
      </div>
    </main>
  )
}