import type { Metadata } from "next";
import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";

import { Toaster } from "@/components/toaster";

import "./globals.css";
import "sileo/styles.css";

const sans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const heading = Plus_Jakarta_Sans({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Evalua - witmind — Plataforma de evaluación psicométrica",
    template: "%s · Evalua - witmind",
  },
  description:
    "Plataforma de evaluación psicométrica, pruebas de Raven, razonamiento lógico y matemático para postulantes de Evalua - witmind.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${sans.variable} ${heading.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        {children}
        <Toaster position="top-right" theme="system" />
      </body>
    </html>
  );
}
