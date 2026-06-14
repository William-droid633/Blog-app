"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Canvas, useThree } from "@react-three/fiber";
import { Suspense } from "react";
import { EffectComposer, Bloom, Noise, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import type { Post } from "@/lib/types";
import FacadeScene from "./FacadeScene";
import CorridorScene, { corridorBounds, START_Z, type FocusState } from "./CorridorScene";

type Phase = "facade" | "entering" | "corridor";

/**
 * Champ de vision adaptatif : en portrait (mobile), l'angle est élargi
 * pour que les murs latéraux du couloir et le fronton restent visibles.
 */
function AdaptiveFov({ base }: { base: number }) {
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  const size = useThree((state) => state.size);

  useEffect(() => {
    const aspect = size.width / size.height;
    // En portrait (mobile), on élargit nettement le champ pour dégager les
    // côtés : la perspective verticale étant contrainte par l'écran haut et
    // étroit, augmenter le FOV est le seul moyen de « voir plus large ».
    camera.fov = aspect < 1 ? Math.min(115, base + (1 - aspect) * 66) : base;
    camera.updateProjectionMatrix();
  }, [camera, size, base]);

  return null;
}

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
  const veilStart = useRef(typeof performance !== "undefined" ? performance.now() : 0);
  const [flash, setFlash] = useState(false);
  // L'aide à la navigation ne s'affiche qu'un court instant à l'entrée du
  // couloir, puis s'efface pour ne plus gêner la contemplation.
  const [showHint, setShowHint] = useState(true);

  const bounds = useMemo(() => corridorBounds(posts.length), [posts.length]);
  const travelZ = useRef(
    session ? THREE.MathUtils.clamp(session.z, bounds.end, bounds.start) : START_Z
  );
  const touchY = useRef<number | null>(null);
  const backAccum = useRef(0);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const focusRef = useRef(focus);
  focusRef.current = focus;

  const highQuality = useMemo(
    () => typeof window !== "undefined" && window.innerWidth >= 768,
    []
  );

  // Bloque le défilement de la page : la molette appartient au musée.
  // On masque aussi le titre et la navigation de l'en-tête (seul le logo
  // reste) pour qu'aucun élément ne traîne pendant les transitions.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.classList.add("museum-immersive");
    return () => {
      document.body.style.overflow = previous;
      document.body.classList.remove("museum-immersive");
    };
  }, []);

  // Lever de rideau une fois la scène prête
  useEffect(() => {
    if (!ready) return;
    // Durée minimale d'affichage : sinon l'écran « HERKVL » flashe (voire ne
    // se voit pas) sur mobile, où le contexte WebGL se crée très vite.
    const shown = performance.now() - veilStart.current;
    const wait = Math.max(350, 1100 - shown);
    const timer = setTimeout(() => setVeil(false), wait);
    return () => clearTimeout(timer);
  }, [ready]);

  // À l'entrée du couloir, l'aide reparaît brièvement puis s'efface (~6 s).
  useEffect(() => {
    if (phase !== "corridor") return;
    setShowHint(true);
    const timer = setTimeout(() => setShowHint(false), 6000);
    return () => clearTimeout(timer);
  }, [phase]);

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

  /** Franchissement des portes du temple : approche fluide jusqu'au seuil,
   *  les portes s'ouvrent sur la lumière, puis l'écran blanc prend le relais
   *  une fois que l'on baigne déjà dans cette lumière (cf. FacadeScene). */
  const enter = useCallback(() => {
    if (phaseRef.current !== "facade") return;
    setPhase("entering");
    // Le voile blanc n'arrive qu'au bout de l'approche, quand la lumière du
    // sanctuaire emplit déjà l'écran : la bascule reste imperceptible.
    setTimeout(() => setFlash(true), 2000);
    setTimeout(() => {
      travelZ.current = START_Z;
      setPhase("corridor");
      setTimeout(() => setFlash(false), 300);
    }, 2400);
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

  /** Retour sur le parvis : on ressort du couloir par où on est entré. */
  const exitToFacade = useCallback(() => {
    if (phaseRef.current !== "corridor" || focusRef.current?.diving) return;
    setFocus(null);
    setFlash(true);
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
    setTimeout(() => {
      setPhase("facade");
      setTimeout(() => setFlash(false), 280);
    }, 550);
  }, []);

  const handleWheel = useCallback(
    (event: React.WheelEvent) => {
      if (phaseRef.current !== "corridor") return;
      const current = focusRef.current;
      if (current) {
        if (!current.diving) setFocus(null);
        return;
      }
      // Au début du couloir, continuer à reculer ramène au temple
      if (event.deltaY < 0 && travelZ.current >= bounds.start - 0.05) {
        backAccum.current += -event.deltaY;
        if (backAccum.current > 260) {
          backAccum.current = 0;
          exitToFacade();
        }
        return;
      }
      backAccum.current = 0;
      advance(event.deltaY * 0.012);
    },
    [advance, bounds, exitToFacade]
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
      // Glisser vers le bas à l'entrée du couloir = ressortir vers le temple
      if (dy > 0 && travelZ.current >= bounds.start - 0.05) {
        backAccum.current += dy;
        if (backAccum.current > 150) {
          backAccum.current = 0;
          exitToFacade();
        }
        return;
      }
      backAccum.current = 0;
      advance(-dy * 0.03);
    },
    [advance, bounds, exitToFacade]
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
        shadows={highQuality}
        dpr={highQuality ? [1, 1.5] : [1, 1.25]}
        gl={{ antialias: true }}
        camera={{ position: [0, 2.1, 25], fov: 58 }}
        onCreated={(state) => {
          // Légère surexposition globale : rend le temple et l'extérieur plus
          // lisibles de jour (écran en pleine lumière), sans toucher au ciel
          // (nébuleuse et étoiles sont en toneMapped={false}).
          state.gl.toneMappingExposure = 1.3;
          setReady(true);
        }}
        onPointerMissed={() => {
          setFocus((current) => (current && !current.diving ? null : current));
        }}
      >
        <AdaptiveFov base={phase === "corridor" ? 62 : 55} />
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
            <FacadeScene entering={phase === "entering"} highQuality={highQuality} />
          )}
        </Suspense>
        {/* Rendu cinématographique : éclat des flammes, grain, vignettage */}
        <EffectComposer multisampling={highQuality ? 4 : 0}>
          <Bloom intensity={0.55} luminanceThreshold={0.88} luminanceSmoothing={0.2} mipmapBlur />
          <Noise premultiply opacity={0.05} />
          <Vignette eskil={false} offset={0.16} darkness={0.78} />
        </EffectComposer>
      </Canvas>

      {/* ——— Interface ——— */}

      {/* Façade : bouton ENTRER dans l'axe de la porte */}
      {phase === "facade" && !veil && (
        <div className="pointer-events-none absolute inset-x-0 bottom-[15%] flex justify-center">
          <button
            type="button"
            onClick={enter}
            className="group pointer-events-auto relative px-16 py-[18px] font-display text-sm font-bold uppercase tracking-widecaps text-goldlight transition-colors duration-500 hover:text-night"
          >
            {/* Double liseré d'or, fond fumé, lueur au survol */}
            <span className="absolute inset-0 border border-gold/45 bg-night/40 backdrop-blur-[2px] transition-all duration-500 group-hover:border-gold group-hover:bg-gold/90 group-hover:shadow-[0_0_46px_rgba(201,163,106,0.4)]" />
            <span className="absolute inset-[5px] border border-gold/25 transition-colors duration-500 group-hover:border-night/25" />
            <span className="relative">Entrer</span>
          </button>
        </div>
      )}

      {/* Couloir : aide à la visite */}
      {phase === "corridor" && !flash && (
        <>
          {/* Indice de focus (toujours) ou rappel de navigation (fugace) */}
          {focus && !focus.diving && focusedPost ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center px-4">
              <p className="border border-parchment/10 bg-night/60 px-5 py-2.5 text-center text-[10px] uppercase tracking-[0.22em] text-parchment/60 backdrop-blur-sm">
                Cliquez à nouveau sur l’œuvre pour entrer dans l’article
              </p>
            </div>
          ) : (
            <div
              className={`pointer-events-none absolute inset-x-0 bottom-6 flex justify-center px-4 transition-opacity duration-1000 ${
                showHint && !focus ? "opacity-100" : "opacity-0"
              }`}
            >
              <p className="border border-parchment/10 bg-night/50 px-5 py-2.5 text-center text-[10px] uppercase tracking-[0.22em] text-parchment/45 backdrop-blur-sm">
                Molette ou glissez pour avancer · cliquez une œuvre pour l’admirer
              </p>
            </div>
          )}

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

      {/* Bascule vers la version classique (masquée pendant les transitions) */}
      {!veil && phase !== "entering" && !flash && (
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
          HERKVL
        </p>
      </div>

      {/* Éclat de lumière : traversée des portes et des toiles. Blanc chaud
          (et non crème) pour prolonger la lumière du sanctuaire. Montée
          rapide → blanc complet pile au changement de scène ; descente plus
          douce, le couloir se révélant déjà baigné de lumière (cf. la lueur
          d'entrée), sans aplat délavé. */}
      <div
        className={`pointer-events-none absolute inset-0 transition-opacity ${
          flash ? "opacity-100 duration-500" : "opacity-0 duration-[800ms]"
        }`}
        style={{
          background:
            "radial-gradient(120% 120% at 50% 45%, #fffaf0 0%, #fdf3e0 55%, #f7ead1 100%)",
        }}
      />
    </div>
  );
}
