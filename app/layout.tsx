import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Sub — Airtime & Data", description: "Fast, affordable airtime and data bundles in Nigeria." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
