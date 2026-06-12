"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import * as THREE from "three";
import type { Post } from "@/lib/types";
import FacadeScene from "./FacadeScene";
import CorridorScene, { corridorBounds, START_Z, type FocusState } from "./CorridorScene";

type Phase = "facade" | "entering" | "corridor";

const SESSION_KEY = "herkul-museum";

function readSession(): { phase: Phase; z: number } | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { phase?: string; z?: number };
    if (parsed.phase === "corridor" && typeof parsed.z === "number") {
      return { phase: "corridor", z: parsed.z };
    }
  } catch {
    /* stockage indisponible : on repart de la façade */
  }
  return null;
}

/**
 * Le musée 3D complet : façade du temple la nuit, traversée des portes
 * de bronze, puis longue galerie où la molette (ou le doigt) fait
 * avancer le visiteur. Un clic sur une œuvre l'approche, un second
 * clic la traverse et ouvre l'article.
 */
export default function Museum3D({
  posts,
  onClassic,
}: {
  posts: Post[];
  onClassic: () => void;
}) {
  const router = useRouter();
  const session = useMemo(readSession, []);

  const [phase, setPhase] = useState<Phase>(session?.phase ?? "facade");
  const [focus, setFocus] = useState<FocusState | null>(null);
  const [ready, setReady] = useState(false);
  const [veil, setVeil] = useState(true);
  const [flash, setFlash] = useState(false);

  const bounds = useMemo(() => corridorBounds(posts.length), [posts.length]);
  const travelZ = useRef(
    session ? THREE.MathUtils.clamp(session.z, bounds.end, bounds.start) : START_Z
  );
  const touchY = useRef<number | null>(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const focusRef = useRef(focus);
  focusRef.current = focus;

  const highQuality = useMemo(
    () => typeof window !== "undefined" && window.innerWidth >= 768,
    []
  );

  // Bloque le défilement de la page : la molette appartient au musée
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  // Lever de rideau une fois la scène prête
  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => setVeil(false), 350);
    return () => clearTimeout(timer);
  }, [ready]);

  // Échap : on recule de l'œuvre
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setFocus((current) => (current && !current.diving ? null : current));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /** Franchissement des portes du temple. */
  const enter = useCallback(() => {
    if (phaseRef.current !== "facade") return;
    setPhase("entering");
    setTimeout(() => setFlash(true), 800);
    setTimeout(() => {
      travelZ.current = START_Z;
      setPhase("corridor");
      setTimeout(() => setFlash(false), 120);
    }, 1700);
  }, []);

  const advance = useCallback(
    (delta: number) => {
      travelZ.current = THREE.MathUtils.clamp(
        travelZ.current - delta,
        bounds.end,
        bounds.start
      );
    },
    [bounds]
  );

  const handleWheel = useCallback(
    (event: React.WheelEvent) => {
      if (phaseRef.current !== "corridor") return;
      const current = focusRef.current;
      if (current) {
        if (!current.diving) setFocus(null);
        return;
      }
      advance(event.deltaY * 0.012);
    },
    [advance]
  );

  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    touchY.current = event.touches[0]?.clientY ?? null;
  }, []);

  const handleTouchMove = useCallback(
    (event: React.TouchEvent) => {
      if (phaseRef.current !== "corridor" || touchY.current === null) return;
      const y = event.touches[0]?.clientY ?? touchY.current;
      const dy = y - touchY.current;
      touchY.current = y;
      const current = focusRef.current;
      if (current) {
        if (!current.diving && Math.abs(dy) > 6) setFocus(null);
        return;
      }
      advance(-dy * 0.03);
    },
    [advance]
  );

  /** Clic sur une œuvre : approche, puis traversée vers l'article. */
  const selectPainting = useCallback(
    (index: number) => {
      const current = focusRef.current;
      if (current?.diving) return;

      if (current?.index === index) {
        // Second clic : on traverse la toile
        setFocus({ index, diving: true });
        setTimeout(() => setFlash(true), 450);
        try {
          sessionStorage.setItem(
            SESSION_KEY,
            JSON.stringify({ phase: "corridor", z: travelZ.current })
          );
        } catch {
          /* ignore */
        }
        const slug = posts[index]?.slug;
        setTimeout(() => {
          if (slug) router.push(`/articles/${slug}`);
        }, 1050);
      } else {
        setFocus({ index, diving: false });
      }
    },
    [posts, router]
  );

  const focusedPost = focus !== null ? posts[focus.index] : null;

  return (
    <div
      className="fixed inset-0 z-40 bg-night"
      style={{ touchAction: "none" }}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    >
      <Canvas
        dpr={[1, 1.75]}
        gl={{ antialias: true }}
        camera={{ position: [0, 4.4, 17], fov: 55 }}
        onCreated={() => setReady(true)}
        onPointerMissed={() => {
          setFocus((current) => (current && !current.diving ? null : current));
        }}
      >
        <Suspense fallback={null}>
          {phase === "corridor" ? (
            <CorridorScene
              posts={posts}
              travelZ={travelZ}
              focus={focus}
              onSelect={selectPainting}
              highQuality={highQuality}
            />
          ) : (
            <FacadeScene entering={phase === "entering"} />
          )}
        </Suspense>
      </Canvas>

      {/* ——— Interface ——— */}

      {/* Façade : bouton ENTRER dans l'axe de la porte */}
      {phase === "facade" && !veil && (
        <div className="pointer-events-none absolute inset-x-0 bottom-[16%] flex flex-col items-center gap-5">
          <p className="text-[11px] uppercase tracking-widecaps text-parchment/50">
            Le musée vous attend
          </p>
          <button
            type="button"
            onClick={enter}
            className="pointer-events-auto border border-gold/60 bg-night/55 px-12 py-4 font-display text-sm font-bold uppercase tracking-widecaps text-goldlight backdrop-blur-sm transition-all duration-300 hover:border-gold hover:bg-gold hover:text-night"
          >
            Entrer
          </button>
        </div>
      )}

      {/* Couloir : aide à la visite */}
      {phase === "corridor" && !flash && (
        <>
          <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center px-4">
            <p className="border border-parchment/10 bg-night/60 px-5 py-2.5 text-center text-[10px] uppercase tracking-[0.22em] text-parchment/55 backdrop-blur-sm">
              {focus && !focus.diving && focusedPost
                ? "Cliquez à nouveau sur l’œuvre pour entrer dans l’article"
                : focus?.diving
                  ? "…"
                  : "Molette ou glissez pour avancer · cliquez une œuvre pour l’admirer"}
            </p>
          </div>

          {focus && !focus.diving && (
            <button
              type="button"
              onClick={() => setFocus(null)}
              className="absolute right-4 top-20 border border-parchment/20 bg-night/60 px-4 py-2.5 text-[10px] uppercase tracking-widecaps text-parchment/70 backdrop-blur-sm transition-colors hover:border-gold hover:text-goldlight"
            >
              ✕ Reprendre la visite
            </button>
          )}

          {posts.length === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4">
              <div className="border border-gold/20 bg-night/70 px-10 py-8 text-center backdrop-blur-sm">
                <p className="font-accent text-2xl italic text-parchment/80">
                  Le vernissage approche…
                </p>
                <p className="mt-3 text-xs text-parchment/45">
                  Les premières œuvres seront bientôt accrochées.
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* Bascule vers la version classique */}
      {!veil && (
        <button
          type="button"
          onClick={onClassic}
          className="absolute bottom-6 right-4 border border-parchment/15 bg-night/60 px-3 py-2 text-[9px] uppercase tracking-[0.2em] text-parchment/40 backdrop-blur-sm transition-colors hover:text-parchment/80"
        >
          Version classique
        </button>
      )}

      {/* Rideau d'ouverture */}
      <div
        className={`pointer-events-none absolute inset-0 flex items-center justify-center bg-night transition-opacity duration-1000 ${
          veil ? "opacity-100" : "opacity-0"
        }`}
      >
        <p className="animate-pulse font-display text-2xl font-bold tracking-widecaps text-gold/80">
          MVSEVM
        </p>
      </div>

      {/* Éclat doré : traversée des portes et des toiles */}
      <div
        className={`pointer-events-none absolute inset-0 bg-parchment transition-opacity duration-700 ${
          flash ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}
