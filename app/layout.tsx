import type { Metadata } from "next";
import { Geist_Mono, Inter, Inter_Tight } from "next/font/google";

import { PageTransitionProvider } from "@/components/page-transition";
import { Toaster } from "@/components/toaster";

import "./globals.css";
import "sileo/styles.css";

const sans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const heading = Inter_Tight({
  variable: "--font-heading",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Evalua — Plataforma de evaluación para selección",
    template: "%s · Evalua",
  },
  description:
    "Postula a convocatorias y rinde tu evaluación en línea. Pruebas psicométricas y de criterio para procesos de selección.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${sans.variable} ${heading.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <PageTransitionProvider>
          {children}
        </PageTransitionProvider>
        <Toaster position="top-right" theme="system" />
      </body>
    </html>
  );
}
