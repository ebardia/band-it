import type { ReactNode } from 'react'
import {
  Playfair_Display,
  Oswald,
  Source_Serif_4,
  Inter,
  JetBrains_Mono,
} from 'next/font/google'
import '@/styles/newspaper-tokens.css'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

const oswald = Oswald({
  subsets: ['latin'],
  variable: '--font-kicker',
  display: 'swap',
})

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-ui',
  display: 'swap',
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export default function DailyLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${playfair.variable} ${oswald.variable} ${sourceSerif.variable} ${inter.variable} ${jetbrains.variable} newspaper-root`}
    >
      {children}
    </div>
  )
}
