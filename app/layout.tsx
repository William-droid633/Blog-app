import type { Metadata } from "next";
import { Cormorant_Garamond, Space_Grotesk, Lora } from "next/font/google";
import Header from "@/components/Header";
import { SITE_NAME, SITE_DESCRIPTION } from "@/lib/config";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${SITE_NAME} — Galerie personnelle`,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="scroll-smooth">
      <body
        className={`${cormorant.variable} ${spaceGrotesk.variable} ${lora.variable} grain flex min-h-screen flex-col bg-night font-body text-parchment antialiased`}
      >
        <Header />
        <main className="flex flex-1 flex-col">{children}</main>
        <footer className="border-t border-parchment/10 bg-night">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-10 text-center">
            <p className="font-display text-2xl font-semibold tracking-wide text-parchment">
              {SITE_NAME}
            </p>
            <p className="text-[11px] uppercase tracking-widecaps text-parchment/40">
              Galerie personnelle
            </p>
            <p className="mt-2 text-xs text-parchment/40">
              © {new Date().getFullYear()} {SITE_NAME}. Tous droits réservés.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
