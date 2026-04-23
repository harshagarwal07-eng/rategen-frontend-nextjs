import type { Metadata } from "next";
import "./globals.css";
import { env } from "@/lib/env";
import { poppins } from "@/lib/font";
import { Toaster } from "@/components/ui/sonner";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import NextTopLoader from "nextjs-toploader";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { Providers } from "@/components/providers";

// Force dynamic rendering to avoid serialization issues during build
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    template: "%s | Rategen",
    default: "",
  },
  description: "Rategen",
  metadataBase: new URL(env.META_URL),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: new URL(env.META_URL),
    title: "Rategen",
    description: "Rategen",
    images: [
      {
        url: "https://rategen.in/_next/image?url=%2Flogo.png&w=2048&q=75",
        width: 1200,
        height: 630,
        alt: "Rategen",
      },
    ],
  },
  keywords: "Rategen",
  icons: {
    icon: [
      {
        media: "(prefers-color-scheme: light)",
        url: "/logo-square.png",
        href: "/logo-square.png",
      },
      {
        media: "(prefers-color-scheme: dark)",
        url: "/logo-square-white.png",
        href: "/logo-square-white.png",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${poppins.variable} antialiased h-screen`}>
        <Providers>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
            <NextTopLoader showSpinner={false} />

            <NuqsAdapter>
              {children}
              <Toaster richColors position="top-center" />
            </NuqsAdapter>
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
