import type { Metadata, Viewport } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

// Tipografía MD2: Roboto 400 (regular), 500 (medium), 700 (bold)
const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#121212",
};

export const metadata: Metadata = {
  title: "Voces Campesinas - Emisora Digital",
  description: "El Campo Nos Une - Emisora Digital Voces Campesinas. Música, noticias y cultura campesina en vivo.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Voces Campesinas",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
  openGraph: {
    title: "Voces Campesinas - Emisora Digital",
    description: "El Campo Nos Une - Tu emisora digital del campo",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning data-theme="dark">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#121212" id="theme-color-meta" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function(){});
                });
              }
            `,
          }}
        />
      </head>
      <body className={`${roboto.variable} antialiased`} style={{ fontFamily: "var(--font-roboto), 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif", margin: 0, padding: 0, overflow: 'hidden', height: '100%', width: '100%' }}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}