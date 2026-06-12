"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { SITE_NAME } from "@/lib/config";

const HeroScene = dynamic(() => import("./HeroScene"), { ssr: false });

const letters = SITE_NAME.toUpperCase().split("");

export default function Hero() {
  return (
    <section className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden">
      {/* Halo de lumière de fond + scène 3D */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(1100px 600px at 50% 35%, rgba(201,163,106,0.10), transparent 70%)",
        }}
        aria-hidden="true"
      />
      <HeroScene />
      {/* Vignettage de salle obscure */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 45%, rgba(12,10,8,0.85) 100%)",
        }}
        aria-hidden="true"
      />

      <div className="pointer-events-none relative z-10 flex flex-col items-center px-4 text-center">
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.2, ease: "easeOut" }}
          className="mb-6 text-[11px] uppercase tracking-widecaps text-gold sm:text-xs"
        >
          Galerie personnelle
        </motion.p>

        <h1
          className="font-display text-[clamp(3.5rem,16vw,11rem)] font-semibold leading-none tracking-tight text-parchment"
          aria-label={SITE_NAME}
        >
          {letters.map((letter, i) => (
            <motion.span
              key={i}
              aria-hidden="true"
              className="inline-block"
              initial={{ opacity: 0, y: 60, rotateX: 80 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{
                duration: 0.9,
                delay: 0.35 + i * 0.08,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              {letter}
            </motion.span>
          ))}
        </h1>

        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1.1, delay: 1.1, ease: [0.16, 1, 0.3, 1] }}
          className="mt-8 h-px w-40 bg-gradient-to-r from-transparent via-gold to-transparent sm:w-64"
          aria-hidden="true"
        />

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 1.25, ease: "easeOut" }}
          className="mt-8 max-w-md font-display text-lg italic text-parchment/70 sm:text-xl"
        >
          Récits, images et réflexions — accrochés ici comme autant d’œuvres.
        </motion.p>
      </div>

      {/* Invitation au défilement */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 2 }}
        className="absolute bottom-8 z-10 flex flex-col items-center gap-3"
        aria-hidden="true"
      >
        <span className="text-[10px] uppercase tracking-widecaps text-parchment/40">
          Entrer
        </span>
        <span className="block h-12 w-px animate-scrollcue bg-gold/70" />
      </motion.div>
    </section>
  );
}
