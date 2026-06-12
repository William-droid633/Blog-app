"use client";

import { useRef, useState } from "react";
import ArticleCard from "@/components/ArticleCard";
import Reveal from "@/components/gallery/Reveal";
import type { Post } from "@/lib/types";

/** Largeurs alternées pour un accrochage de galerie asymétrique. */
function spanFor(index: number): string {
  const pattern = [
    "md:col-span-7",
    "md:col-span-5 md:mt-24",
    "md:col-span-5",
    "md:col-span-7 md:mt-24",
  ];
  return pattern[index % pattern.length];
}

/**
 * Le mur d'exposition : grille asymétrique d'œuvres, balayée par
 * un faisceau de lumière qui suit le curseur.
 */
export default function GalleryGrid({ posts }: { posts: Post[] }) {
  const wall = useRef<HTMLDivElement>(null);
  const [beam, setBeam] = useState<React.CSSProperties>({ opacity: 0 });

  const handleMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const el = wall.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setBeam({
      opacity: 1,
      background: `radial-gradient(700px circle at ${event.clientX - rect.left}px ${
        event.clientY - rect.top
      }px, rgba(201,163,106,0.07), transparent 70%)`,
    });
  };

  return (
    <div
      ref={wall}
      onMouseMove={handleMove}
      onMouseLeave={() => setBeam({ opacity: 0, transition: "opacity 700ms ease" })}
      className="relative"
    >
      {/* Faisceau du projecteur */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={beam}
        aria-hidden="true"
      />

      <div className="relative z-10 grid grid-cols-1 gap-x-10 gap-y-16 sm:gap-y-20 md:grid-cols-12">
        {posts.map((post, index) => (
          <Reveal
            key={post.id}
            delay={(index % 2) * 0.12}
            className={`col-span-1 ${spanFor(index)}`}
          >
            <ArticleCard post={post} index={index} />
          </Reveal>
        ))}
      </div>
    </div>
  );
}
