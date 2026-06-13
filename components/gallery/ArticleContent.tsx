"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * Rendu enrichi du contenu d'article (HTML de l'éditeur), côté lecture :
 *  — chaque image est habillée d'une légende (son texte alternatif), élargie
 *    au-delà de la colonne sur grand écran, et agrandissable au clic (lightbox) ;
 *  — les blocs apparaissent en douceur à mesure qu'ils entrent dans l'écran.
 * Le HTML restant intact, l'enrichissement se fait après le montage par
 * manipulation directe du DOM (React ne gère pas l'intérieur d'un
 * dangerouslySetInnerHTML).
 */
export default function ArticleContent({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<{ src: string; alt: string } | null>(null);

  const openZoom = useCallback((src: string, alt: string) => setZoom({ src, alt }), []);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    // Habillage des images : figure + légende + débord + clic pour agrandir
    const imgs = Array.from(root.querySelectorAll("img"));
    const cleanups: Array<() => void> = [];
    imgs.forEach((img) => {
      img.loading = "lazy";
      img.decoding = "async";
      const alt = img.getAttribute("alt")?.trim() ?? "";

      let figure = img.closest("figure");
      if (!figure) {
        figure = document.createElement("figure");
        img.parentNode?.insertBefore(figure, img);
        figure.appendChild(img);
        if (alt) {
          const caption = document.createElement("figcaption");
          caption.textContent = alt;
          figure.appendChild(caption);
        }
      }
      figure.classList.add("bleed");

      const onClick = () => openZoom(img.currentSrc || img.src, alt);
      img.addEventListener("click", onClick);
      cleanups.push(() => img.removeEventListener("click", onClick));
    });

    // Révélation progressive des blocs de premier niveau
    const blocks = Array.from(root.children) as HTMLElement[];
    blocks.forEach((block) => block.classList.add("r-rise"));
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("r-in");
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.04 }
    );
    blocks.forEach((block) => io.observe(block));

    return () => {
      io.disconnect();
      cleanups.forEach((fn) => fn());
    };
  }, [html, openZoom]);

  // Échap + verrouillage du défilement quand l'image est agrandie
  useEffect(() => {
    if (!zoom) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setZoom(null);
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [zoom]);

  return (
    <>
      <div ref={ref} className="rich-text" dangerouslySetInnerHTML={{ __html: html }} />

      <AnimatePresence>
        {zoom && (
          <motion.div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-[#1a130c]/92 p-4 backdrop-blur-sm sm:p-10"
            style={{ cursor: "zoom-out" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setZoom(null)}
          >
            <button
              type="button"
              aria-label="Fermer"
              onClick={() => setZoom(null)}
              className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full border border-parchment/25 text-parchment/70 transition-colors hover:border-gold hover:text-goldlight"
            >
              ✕
            </button>
            <motion.figure
              className="max-h-full max-w-5xl"
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
              onClick={(event) => event.stopPropagation()}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={zoom.src}
                alt={zoom.alt}
                className="max-h-[82vh] w-auto rounded-md object-contain shadow-2xl"
              />
              {zoom.alt && (
                <figcaption className="mt-4 text-center font-accent text-base italic text-parchment/70">
                  {zoom.alt}
                </figcaption>
              )}
            </motion.figure>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
