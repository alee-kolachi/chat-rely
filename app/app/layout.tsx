import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { ChatrelySiteWidget } from "@/components/marketing/chatrely-site-widget";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ChatRely",
    template: "%s · ChatRely",
  },
  description: "AI support that knows your product",
  icons: {
    icon: "/chat-rely.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col font-sans" suppressHydrationWarning>
        {children}
        <ChatrelySiteWidget />
      </body>
    </html>
  );
}
