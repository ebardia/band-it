import Image from "next/image"

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="text-center">
        {/* Just the logo - bigger */}
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
        
        {/* Just the buttons */}
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