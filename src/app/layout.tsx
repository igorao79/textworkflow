import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/ui/header";
import { Plasma } from "@/components/Plasma";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FlowForge",
  description: "Create and manage automated workflows with ease",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{
          color: '#ffffff'
        }}
      >
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '120%', height: '120%', maxWidth: '2000px', maxHeight: '2000px' }}>
            <Plasma
              color="#8b0000"
              speed={0.6}
              direction="forward"
              scale={1.0}
              opacity={0.6}
              mouseInteractive={true}
            />
          </div>
        </div>
        <Header />
        <main>
          {children}
        </main>
      </body>
    </html>
  );
}
