import type { Metadata } from "next"
import "./globals.css"
import { TRPCProvider } from "@/lib/trpc-provider"
import { ToastProvider } from "@/components/ui"
import { GuidedFlowProvider } from "@/components/guided-flows"
import { HelpPanel } from "@/components/help/HelpPanel"

export const metadata: Metadata = {
  title: "",
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
              <HelpPanel />
            </GuidedFlowProvider>
          </ToastProvider>
        </TRPCProvider>
      </body>
    </html>
  )
}