import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { Toaster } from "@/components/toaster";

import "./globals.css";
import "sileo/styles.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster position="top-right" theme="system" />
      </body>
    </html>
  );
}
