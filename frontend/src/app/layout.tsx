import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

// Yazı tipini ayarlıyoruz
const inter = Inter({ subsets: ["latin"] });

// Sitenin SEO ve Sekme başlık ayarları
export const metadata: Metadata = {
  title: "UniVerse | Öğrenci Ekosistemi",
  description: "Kampüs içi ilan, ders ve carpooling platformu",
};

export default function RootLayout({
                                     children,
                                   }: Readonly<{
  children: React.ReactNode;
}>) {
  return (
      <html lang="tr">
      {/* Koyu tema arka planını body'e veriyoruz */}
      <body className={`${inter.className} bg-[#0B0F19] text-gray-100 antialiased min-h-screen flex flex-col`}>

      <Navbar />

      {/* Sayfa içerikleri navbar'ın altında kalmasın diye pt-24 (padding-top) ekliyoruz */}
      <main className="flex-grow pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {children}
      </main>

      </body>
      </html>
  );
}