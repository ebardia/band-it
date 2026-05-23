import type { ReactNode } from 'react'
import { Archivo_Black, Oswald, Source_Serif_4, Inter, JetBrains_Mono, Permanent_Marker } from 'next/font/google'
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

const permanentMarker = Permanent_Marker({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-protest',
  display: 'swap',
})

const fontClassName = `${archivoBlack.variable} ${oswald.variable} ${sourceSerif.variable} ${inter.variable} ${jetbrains.variable} ${permanentMarker.variable} newspaper-root`

type Props = {
  children: ReactNode
}

/**
 * Shared typography + design tokens for editorial surfaces (/daily, profile, etc.).
 */
export function EditorialSurface({ children }: Props) {
  return <div className={fontClassName}>{children}</div>
}
