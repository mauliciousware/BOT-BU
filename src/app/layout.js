import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Viewport configuration (separate export as required by Next.js)
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata = {
  // MetadataBase for proper Open Graph and Twitter image resolution
  metadataBase: new URL('https://bu-chat-test.vercel.app'),
  
  title: "Bot Bu - Binghamton University AI Assistant",
  description: "Your intelligent AI assistant for Binghamton University. Get instant answers about courses, schedules, campus life, and more with our advanced 3-tier intelligence system.",
  keywords: ["Binghamton University", "Bot Bu", "AI Assistant", "University Chatbot", "Campus Assistant", "Student Help"],
  authors: [{ name: "Binghamton University" }],
  creator: "Binghamton University",
  publisher: "Binghamton University",
  
  // Favicon and icons using your Logo.ico
  icons: {
    icon: [
      { url: '/Logo.ico' },
      { url: '/Logo.ico', sizes: '16x16', type: 'image/x-icon' },
      { url: '/Logo.ico', sizes: '32x32', type: 'image/x-icon' },
    ],
    apple: [
      { url: '/Logo.png' },
      { url: '/Logo.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: ['/Logo.ico'],
  },
  
  // Open Graph (Facebook, WhatsApp, LinkedIn)
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://bu-chat-test.vercel.app',
    siteName: 'Bot Bu',
    title: 'Bot Bu - Binghamton University AI Assistant',
    description: 'Your intelligent AI assistant for Binghamton University. Get instant answers about courses, schedules, campus life, and more.',
    images: [
      {
        url: '/Logo.png',
        width: 1200,
        height: 630,
        alt: 'Bot Bu - Binghamton University AI Assistant',
      },
    ],
  },
  
  // Twitter Card
  twitter: {
    card: 'summary_large_image',
    title: 'Bot Bu - Binghamton University AI Assistant',
    description: 'Your intelligent AI assistant for Binghamton University. Get instant answers about courses, schedules, campus life, and more.',
    images: ['/Logo.png'],
    creator: '@BinghamtonU',
  },
  
  // WhatsApp and other messaging apps use Open Graph
  // Additional metadata
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  
  // App information
  applicationName: 'Bot Bu',
  appleWebApp: {
    capable: true,
    title: 'Bot Bu',
    statusBarStyle: 'black-translucent',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
