import type { Metadata } from "next";
import Navbar from "@/components/ui/Navbar";
import SessionExpiredToast from "@/components/ui/SessionExpiredToast";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bily Card - Gaming Top-Up Store",
  description: "Buy PUBG UC, Free Fire Diamonds, Steam Wallet and TikTok Coins instantly",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-[#020617] text-white min-h-screen">
        <Navbar />
        <SessionExpiredToast />
        <main className="relative pt-[108px] md:pt-[84px]">{children}</main>
      </body>
    </html>
  );
}
