import type { Metadata } from "next";
import AppChrome from "@/components/shared/AppChrome";
import SearchCatalogHydrator from "@/components/shared/SearchCatalogHydrator";
import { getSearchDisplayProducts } from "@/lib/search/getSearchDisplayProducts";
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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const searchProducts = await getSearchDisplayProducts();

  return (
    <html lang="en">
      <body className="antialiased bg-[#020617] text-white min-h-screen">
        <SearchCatalogHydrator products={searchProducts} />
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  );
}
