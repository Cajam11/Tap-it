import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
};

export const metadata: Metadata = {
  title: "Premium Gyms – Powered by Tap-it",
  description: "Experience the ultimate premium gym environment. No queues, just results.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sk" className="dark">
      <body className={geist.className}>{children}</body>
    </html>
  );
}
