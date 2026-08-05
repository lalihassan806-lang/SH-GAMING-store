import type { Metadata } from "next";
import "./globals.css";

const STORE = process.env.NEXT_PUBLIC_STORE_NAME || "SH GAMING STORE";

export const metadata: Metadata = {
  title: `${STORE} — Gaming keys, instant vault delivery`,
  description:
    "Premium gaming keys with fast checkout and instant vault delivery. JazzCash, Easypaisa, Bank Transfer, Binance Pay and USDT accepted.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
