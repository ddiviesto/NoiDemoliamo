import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

// ⭐ 25/08 (scelto da Davide sul mockup): IL CARATTERE DEL MARCHIO.
// Serve SOLO per scrivere "NoiDemoliamo", non per i testi della pagina:
// il nome deve avere una forma sua, altrimenti sembra una parola qualsiasi.
const marchio = Outfit({
  subsets: ["latin"],
  weight: ["500", "800"],   // "Noi" leggero + "Demoliamo" pieno
  variable: "--font-marchio",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NoiDemoliamo — Demolizione auto gratuita",
  description: "Richiedi la demolizione gratuita della tua auto. Ritiro a domicilio, certificato di rottamazione e radiazione PRA inclusi.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // ⭐ 28/07 (proposta 2 approvata): sul telefono l'app è a tutto schermo con
  // l'header BLU in cima — la cornice del browser si fonde col blu
  themeColor: "#1d4ed8",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className={`h-full antialiased ${marchio.variable}`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}