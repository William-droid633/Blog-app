"use client";

import { useRef, useState } from "react";
import ArticleCard from "@/components/ArticleCard";
import Reveal from "@/components/gallery/Reveal";
import type { Post } from "@/lib/types";

/** Décalages alternés : un accrochage de niches comme dans un atrium. */
function offsetFor(index: number): string {
  const pattern = ["", "md:mt-16", "md:mt-32"];
  return pattern[index % pattern.length];
}

/**
 * L'atrium : rangée de niches votives balayée par un faisceau
 * de lumière qui suit le curseur.
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
      {/* Faisceau de torche */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={beam}
        aria-hidden="true"
      />

      <div className="relative z-10 grid grid-cols-1 gap-x-8 gap-y-16 sm:grid-cols-2 sm:gap-y-20 md:grid-cols-3 lg:gap-x-12">
        {posts.map((post, index) => (
          <Reveal
            key={post.id}
            delay={(index % 3) * 0.1}
            className={offsetFor(index)}
          >
            <ArticleCard post={post} index={index} />
          </Reveal>
        ))}
      </div>
    </div>
  );
}
