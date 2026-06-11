import type { Metadata } from "next";
import { Lora, Nunito_Sans } from "next/font/google";
import Header from "@/components/Header";
import { SITE_NAME, SITE_DESCRIPTION } from "@/lib/config";
import "./globals.css";

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: {
    default: SITE_NAME,
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
    <html lang="fr">
      <body
        className={`${lora.variable} ${nunitoSans.variable} flex min-h-screen flex-col`}
      >
        <Header />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-latte bg-sand/50">
          <div className="mx-auto max-w-5xl px-4 py-6 text-center text-sm text-mocha">
            © {new Date().getFullYear()} {SITE_NAME}. Tous droits réservés.
          </div>
        </footer>
      </body>
    </html>
  );
}
