import type { Metadata } from "next";
import { Cairo, Inter } from "next/font/google";

import "./globals.css";
import { LocaleProvider } from "@/components/providers/LocaleProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Zaylias",
  description: "Budget app with multilingual support",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="sv"
      suppressHydrationWarning
      className={`${inter.variable} ${cairo.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
