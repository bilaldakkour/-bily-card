import type { Metadata } from "next";
import AppChrome from "@/components/shared/AppChrome";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bily Card - Gaming Top-Up Store",
  description: "Buy PUBG UC, Free Fire Diamonds, Steam Wallet and TikTok Coins instantly",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-[#020617] text-white min-h-screen">
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  );
}
