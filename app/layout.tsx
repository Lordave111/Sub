import type { Metadata } from "next";
import "./globals.css";
import "./fraudguard-theme.css";

export const viewport = { width: "device-width", initialScale: 1, maximumScale: 5 };
export const metadata: Metadata = {
  title: "FraudGuard — Digital Scam Protection",
  description: "Check suspicious messages, links and investment offers before you trust, click or pay.",
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
