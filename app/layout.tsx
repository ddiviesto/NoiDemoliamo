import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NoiDemoliamo — Demolizione auto gratuita",
  description: "Richiedi la demolizione gratuita della tua auto. Ritiro a domicilio, certificato di rottamazione e radiazione PRA inclusi.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // ⭐ 28/07 (screen iPhone di Davide): la cornice del browser è LAVANDA come
  // lo sfondo delle pagine cliente — via il nero attorno alla pagina
  themeColor: "#e0e7ff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}