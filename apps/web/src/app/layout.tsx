import type { Metadata } from "next"
import "./globals.css"
import { TRPCProvider } from "@/lib/trpc-provider"
import { ToastProvider, Footer } from "@/components/ui"
import { GuidedFlowProvider } from "@/components/guided-flows"
import { HelpProvider } from "@/components/help/HelpContext"
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
      <body className="min-h-screen flex flex-col">
        <TRPCProvider>
          <ToastProvider>
            <GuidedFlowProvider>
              <HelpProvider>
                <div className="flex-1 flex flex-col">
                  {children}
                </div>
                <Footer />
                <HelpPanel />
              </HelpProvider>
            </GuidedFlowProvider>
          </ToastProvider>
        </TRPCProvider>
      </body>
    </html>
  )
}