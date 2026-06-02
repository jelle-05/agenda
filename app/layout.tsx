import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import SwRegistratie from '@/components/SwRegistratie'
import './globals.css'

const geist = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Agenda',
  description: 'Persoonlijke agenda',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Agenda',
  },
}

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className={`${geist.variable} h-full`}>
      <body className="h-full overflow-hidden">
        <SwRegistratie />
        {children}
      </body>
    </html>
  )
}
