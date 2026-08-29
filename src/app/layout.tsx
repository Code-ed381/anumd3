import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { Toaster } from "sonner";
import { Providers } from "@/components/providers";
import { WhatsAppButton } from "@/components/whatsapp-button";
import { getBusinessName } from "@/lib/config";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: getBusinessName(),
    template: `%s · ${getBusinessName()}`,
  },
  description: "Pre-order authentic Ghanaian meals for delivery",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/logo.jpeg", type: "image/jpeg" }],
    apple: [{ url: "/logo.jpeg", type: "image/jpeg" }],
  },
  appleWebApp: {
    capable: true,
    title: getBusinessName(),
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b391b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>{children}</Providers>
        <Toaster position="top-center" richColors />
        <WhatsAppButton phone={process.env.OWNER_PHONE || ""} />
      </body>
    </html>
  );
}
