import Image from "@tiptap/extension-image";

/**
 * Image redimensionnable : l'attribut `width` (en %) est stocké dans le HTML,
 * et ajustable depuis la barre d'outils quand une image est sélectionnée.
 */
export const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: "100%",
        parseHTML: (element) =>
          element.style.width || element.getAttribute("width") || "100%",
        renderHTML: (attributes) => ({
          style: `width: ${attributes.width}`,
        }),
      },
    };
  },
});
