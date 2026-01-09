import type { Metadata } from "next"
import "./globals.css"

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
      <body>{children}</body>
    </html>
  )
}