import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

/** Display con carácter para titulares; cuerpo cálido y legible. */
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  weight: ["400", "600", "700", "800"],
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
    <html lang="es" className={`${bricolage.variable} ${figtree.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
