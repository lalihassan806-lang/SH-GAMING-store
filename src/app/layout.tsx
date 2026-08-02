import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Toaster } from "sonner";

const storeName = process.env.NEXT_PUBLIC_STORE_NAME || "DRIP CLIENT OFFICIAL";

export const metadata: Metadata = {
  title: `${storeName} | Digital Product Store`,
  description: "Premium digital products delivered instantly.",
  themeColor: "#E84FFF"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full" suppressHydrationWarning>
      <body className="relative flex min-h-full flex-col bg-background text-foreground">
        <SiteHeader />
        <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-6">
          {children}
        </main>
        <SiteFooter />
        <Toaster theme="dark" richColors position="top-center" />
      </body>
    </html>
  );
}
