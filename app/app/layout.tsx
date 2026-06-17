import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { Inter } from "next/font/google";
import { GoogleAnalytics } from "@/components/analytics/google-analytics";
import { StaleAuthSessionCleanup } from "@/components/auth/stale-auth-session-cleanup";
import { ChatrelySiteWidget } from "@/components/marketing/chatrely-site-widget";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ChatRely",
    template: "%s · ChatRely",
  },
  description: "AI support that knows your product",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} ${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <GoogleAnalytics />
      </head>
      <body className="flex min-h-full flex-col font-sans" suppressHydrationWarning>
        <StaleAuthSessionCleanup />
        {children}
        <ChatrelySiteWidget />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
