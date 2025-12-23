import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { TRPCReactProvider } from "@/trpc/trpc-server/react"
import { headers } from "next/headers"
import { cache } from "react"
import { Toaster } from "sonner"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Sign In - DeployMonitor",
  description: "AI-powered deployment monitoring and real-time analytics for modern development teams",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

const getHeaders = cache(async () => headers());

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        <TRPCReactProvider headersPromise={getHeaders()}>
          {children}
        </TRPCReactProvider>
        <Toaster richColors theme="system" />
      </body>
    </html>
  )
}
