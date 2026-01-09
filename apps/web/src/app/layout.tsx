import type { Metadata } from "next"
import "./globals.css"
import { TRPCProvider } from "@/lib/trpc-provider"

export const metadata: Metadata = {
  title: "Band IT - Decentralized Governance",
  description: "Governance platform for bands and collectives",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <TRPCProvider>
          {children}
        </TRPCProvider>
      </body>
    </html>
  )
}