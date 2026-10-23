import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "./globals.css";
import { LocaleProvider } from "@/components/providers/LocaleProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Zaylias",
  description: "Budget app with multilingual support",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="sv" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-950 text-white">
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
