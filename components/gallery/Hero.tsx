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
        {/* Fronton du temple */}
        <motion.svg
          viewBox="0 0 400 64"
          className="w-[min(82vw,540px)]"
          fill="none"
          aria-hidden="true"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        >
          <path d="M6 58 L200 6 L394 58" stroke="#C9A36A" strokeWidth="1.5" />
          <path d="M34 58 L200 14 L366 58" stroke="#C9A36A" strokeOpacity="0.35" strokeWidth="1" />
          <circle cx="200" cy="34" r="5" stroke="#C9A36A" strokeOpacity="0.6" strokeWidth="1" />
        </motion.svg>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.4, ease: "easeOut" }}
          className="mt-7 text-[11px] uppercase tracking-widecaps text-gold sm:text-xs"
        >
          MVSEVM · PERSONALE
        </motion.p>

        {/* Inscription monumentale */}
        <h1
          className="mt-4 font-display text-[clamp(3rem,14vw,9.5rem)] font-bold leading-none tracking-inscription text-parchment"
          style={{ perspective: "700px" }}
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
                delay: 0.55 + i * 0.08,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              {letter}
            </motion.span>
          ))}
        </h1>

        {/* Architrave */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1.1, delay: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="mt-8 flex w-[min(70vw,420px)] flex-col gap-1.5"
          aria-hidden="true"
        >
          <span className="h-px w-full bg-gradient-to-r from-transparent via-gold to-transparent" />
          <span className="h-px w-full bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 1.35, ease: "easeOut" }}
          className="mt-8 max-w-md font-accent text-xl italic text-parchment/70 sm:text-2xl"
        >
          Récits, images et souvenirs — exposés sous les voûtes d’un temple.
        </motion.p>
      </div>

      {/* Invitation à entrer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 2.1 }}
        className="absolute bottom-8 z-10 flex flex-col items-center gap-3"
        aria-hidden="true"
      >
        <span className="text-[10px] uppercase tracking-widecaps text-parchment/40">
          Entrer dans l’atrium
        </span>
        <span className="block h-12 w-px animate-scrollcue bg-gold/70" />
      </motion.div>
    </section>
  );
}
