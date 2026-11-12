import type { Metadata, Viewport } from "next";
import Providers from "@/components/Providers";
import ActiveIdeaPopup from "@/components/ActiveIdeaPopup";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fynovo Finance",
  description: "Income, expenses and profit & loss at a glance.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Fynovo" },
};
export const viewport: Viewport = { themeColor: "#177C63", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><Providers>{children}<ActiveIdeaPopup /></Providers></body></html>;
}
