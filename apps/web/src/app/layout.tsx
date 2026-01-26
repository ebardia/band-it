import type { Metadata } from "next"
import "./globals.css"
import { TRPCProvider } from "@/lib/trpc-provider"
import { ToastProvider } from "@/components/ui"
import { GuidedFlowProvider, GoalSelector, allFlows } from "@/components/guided-flows"

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
          <ToastProvider>
            <GuidedFlowProvider>
              {children}
              <GoalSelector flows={allFlows} />
            </GuidedFlowProvider>
          </ToastProvider>
        </TRPCProvider>
      </body>
    </html>
  )
}