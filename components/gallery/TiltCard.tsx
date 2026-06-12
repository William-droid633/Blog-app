"use client";

import { useRef, useState } from "react";

const MAX_TILT = 7; // degrés

/**
 * Carte 3D : s'incline en suivant la souris, avec un reflet de lumière
 * (sheen) qui glisse sur la surface — comme un tableau sous verre.
 */
export default function TiltCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});
  const [sheen, setSheen] = useState<React.CSSProperties>({ opacity: 0 });

  const handleMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;

    setStyle({
      transform: `perspective(1100px) rotateX(${(0.5 - py) * MAX_TILT}deg) rotateY(${(px - 0.5) * MAX_TILT}deg) scale3d(1.015, 1.015, 1)`,
      transition: "transform 80ms linear",
    });
    setSheen({
      opacity: 1,
      background: `radial-gradient(420px circle at ${px * 100}% ${py * 100}%, rgba(232,205,156,0.16), transparent 65%)`,
    });
  };

  const handleLeave = () => {
    setStyle({
      transform: "perspective(1100px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)",
      transition: "transform 600ms cubic-bezier(0.16, 1, 0.3, 1)",
    });
    setSheen({ opacity: 0, transition: "opacity 600ms ease" });
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={style}
      className={`relative will-change-transform ${className ?? ""}`}
    >
      {children}
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={sheen}
        aria-hidden="true"
      />
    </div>
  );
}
