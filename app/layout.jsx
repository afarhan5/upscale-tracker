import './globals.css'

export const metadata = {
  title: 'Upscale Tracker - AI-Powered Life OS',
  description: 'Track habits, goals, tasks, finances & skills. AI coaching, analytics, focus timer. Your complete life operating system.',
  keywords: 'habit tracker, goal tracker, productivity, finance tracker, AI coach, focus timer, skill roadmap',
  openGraph: {
    title: 'Upscale Tracker',
    description: 'AI-Powered Life Operating System',
    images: [{ url: '/logo-full.png', width: 1400, height: 400, alt: 'Upscale Tracker' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Upscale Tracker',
    description: 'AI-Powered Life Operating System',
    images: ['/logo-full.png'],
  },
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
}

export const viewport = {
  themeColor: '#070711',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head></head>
      <body style={{margin:0,minHeight:"100vh"}} suppressHydrationWarning>{children}</body>
    </html>
  )
}
