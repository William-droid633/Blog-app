import type { Metadata, Viewport } from "next";
import { Cinzel, Cormorant_Garamond, Lora, Space_Grotesk } from "next/font/google";
import Header from "@/components/Header";
import Meander from "@/components/roman/Meander";
import { SITE_NAME, SITE_DESCRIPTION } from "@/lib/config";
import { toRoman } from "@/lib/roman";
import "./globals.css";

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-accent",
  display: "swap",
});

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${SITE_NAME} — Musée personnel`,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
};

export const viewport: Viewport = {
  themeColor: "#0C0A08",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const year = new Date().getFullYear();

  return (
    <html lang="fr" className="scroll-smooth">
      <body
        className={`${cinzel.variable} ${cormorant.variable} ${lora.variable} ${spaceGrotesk.variable} grain flex min-h-screen flex-col overflow-x-clip bg-night font-body text-parchment antialiased`}
      >
        <Header />
        <main className="flex flex-1 flex-col">{children}</main>

        <footer className="relative border-t border-gold/20 bg-night">
          <Meander className="absolute -top-2 left-0 opacity-50" />
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-4 pb-10 pt-14 text-center">
            {/* Façade de temple stylisée */}
            <div className="flex h-14 items-end gap-5 opacity-35" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="flex h-full w-3 flex-col items-center">
                  <div className="h-1 w-4 bg-stone" />
                  <div
                    className="w-2.5 flex-1"
                    style={{
                      background:
                        "repeating-linear-gradient(90deg, #cfc8b6 0 2px, #8f8773 2px 3px)",
                    }}
                  />
                  <div className="h-1 w-4 bg-stone" />
                </div>
              ))}
            </div>
            <p className="font-display text-2xl font-semibold tracking-inscription text-parchment">
              {SITE_NAME.toUpperCase()}
            </p>
            <p className="text-[10px] uppercase tracking-widecaps text-gold/60">
              MVSEVM · PERSONALE
            </p>
            <p className="text-xs text-parchment/35">
              © {year} {SITE_NAME} · {toRoman(year)} · Tous droits réservés
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
