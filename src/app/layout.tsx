import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import RegisterSW from "@/components/RegisterSW";
import NightAuditReminder from "@/components/NightAuditReminder";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StaySync | Enterprise PMS",
  description: "Next-generation property management and real-time operations.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "StaySync",
  },
};

export const viewport = {
  themeColor: "#060608",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} dark`} suppressHydrationWarning>
      <body className="bg-[#09090b] text-zinc-300 antialiased selection:bg-indigo-500/30">
        <RegisterSW />
        <NightAuditReminder />
        {children}
      </body>
    </html>
  );
}