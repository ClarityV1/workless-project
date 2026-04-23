import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ShiftDesk',
  description: 'People management platform for warehouse shift managers',
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
