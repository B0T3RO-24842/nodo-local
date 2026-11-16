import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "NODO · Sistema para comercios locales",
    template: "%s · NODO",
  },
  description:
    "Marketing, fidelización y operaciones en un único ecosistema modular para comercios locales. Landing cinemática, tarjeta Wallet, carta analítica y comandas seguras.",
  applicationName: "NODO Local",
  keywords: [
    "comercio local",
    "fidelización",
    "carta digital",
    "comandas",
    "Next.js",
    "restauración",
  ],
  authors: [{ name: "NODO Local" }],
  openGraph: {
    title: "NODO · El barrio, en otro nivel",
    description:
      "Cuatro motores conectados: escaparate, tarjeta, carta y salón. Una sola infraestructura.",
    type: "website",
    locale: "es_ES",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#080907",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${inter.variable} ${mono.variable}`}>
      <body className="bg-tinta-950 text-hueso-100 antialiased">{children}</body>
    </html>
  );
}
