import type { ReactNode } from 'react'
import { Archivo_Black, Oswald, Source_Serif_4, Inter, JetBrains_Mono } from 'next/font/google'
import '@/styles/newspaper-tokens.css'

const archivoBlack = Archivo_Black({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-lead-black',
  display: 'swap',
})

const oswald = Oswald({
  subsets: ['latin'],
  weight: ['500', '700'],
  variable: '--font-condensed',
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
      className={`${archivoBlack.variable} ${oswald.variable} ${sourceSerif.variable} ${inter.variable} ${jetbrains.variable} newspaper-root`}
    >
      {children}
    </div>
  )
}
