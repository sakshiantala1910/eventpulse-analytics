import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { CartProvider } from "@/components/CartContext";
import { EventPulseProvider } from "@/components/EventPulseProvider";
import { Nav } from "@/components/Nav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Trattoria Pulse — EventPulse demo",
  description: "Restaurant demo app instrumented with the EventPulse analytics SDK.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-neutral-50 text-neutral-900">
        <CartProvider>
          <Suspense fallback={null}>
            <EventPulseProvider>
              <Nav />
              <main className="flex-1">{children}</main>
            </EventPulseProvider>
          </Suspense>
        </CartProvider>
      </body>
    </html>
  );
}
