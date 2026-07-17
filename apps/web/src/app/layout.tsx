import type { Metadata, Viewport } from "next";
import { Fraunces, Figtree } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

/** Serif editorial con alma para titulares; cuerpo cálido y legible. */
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["400", "500", "600", "700", "900"],
  style: ["normal", "italic"],
});
const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "MenteLab — Entrená tu mente jugando",
  description:
    "Plataforma de entrenamiento y medición de habilidades cognitivas para escuelas. Jugá, mejorá y seguí tu progreso.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // evita zoom accidental en juegos táctiles
  themeColor: "#faf6ec",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${fraunces.variable} ${figtree.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
