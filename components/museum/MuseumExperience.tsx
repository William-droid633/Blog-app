"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import ClassicMuseum from "@/components/gallery/ClassicMuseum";
import type { Post } from "@/lib/types";

function Veil() {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-night">
      <p className="animate-pulse font-display text-2xl font-bold tracking-widecaps text-gold/80">
        MVSEVM
      </p>
    </div>
  );
}

const Museum3D = dynamic(() => import("./Museum3D"), {
  ssr: false,
  loading: () => <Veil />,
});

/**
 * Choisit l'expérience : visite 3D (WebGL disponible et animations
 * autorisées) ou version classique. L'utilisateur peut basculer
 * librement entre les deux.
 */
export default function MuseumExperience({
  posts,
  loadError = false,
}: {
  posts: Post[];
  loadError?: boolean;
}) {
  const [mode, setMode] = useState<"pending" | "3d" | "classic">("pending");
  const [webglOk, setWebglOk] = useState(false);

  useEffect(() => {
    let supported = false;
    try {
      const canvas = document.createElement("canvas");
      supported = Boolean(
        canvas.getContext("webgl2") || canvas.getContext("webgl")
      );
    } catch {
      supported = false;
    }
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    setWebglOk(supported);
    setMode(supported && !reduceMotion ? "3d" : "classic");
  }, []);

  if (mode === "pending") {
    return <Veil />;
  }

  if (mode === "classic") {
    return (
      <ClassicMuseum
        posts={posts}
        loadError={loadError}
        onEnter3D={webglOk ? () => setMode("3d") : undefined}
      />
    );
  }

  return <Museum3D posts={posts} onClassic={() => setMode("classic")} />;
}
