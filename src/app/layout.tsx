import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { RegisterServiceWorker } from "@/components/pwa/RegisterServiceWorker";
import { ConfirmProvider } from "@/components/ui/ConfirmDialog";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: "Finanças Pessoais",
    template: "%s | Finanças",
  },
  description: "Controle financeiro pessoal e empresarial inteligente, ágil e seguro.",
  applicationName: "Finanças App",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Finanças",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100">
        <RegisterServiceWorker />
        <Toaster
          position="top-right"
          richColors
          theme="dark"
          closeButton
          toastOptions={{
            style: {
              background: '#18181b',
              borderColor: '#27272a',
              color: '#f4f4f5',
            },
          }}
        />
        <ConfirmProvider>
          {children}
        </ConfirmProvider>
      </body>
    </html>
  );
}
