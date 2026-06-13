"use client";

import { useCallback, useEffect } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Youtube from "@tiptap/extension-youtube";
import TextAlign from "@tiptap/extension-text-align";
import TextStyle from "@tiptap/extension-text-style";
import FontFamily from "@tiptap/extension-font-family";
import { Color } from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Underline from "@tiptap/extension-underline";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import Placeholder from "@tiptap/extension-placeholder";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Highlighter,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Minus,
  Palette,
  Quote,
  Redo2,
  Strikethrough,
  Table as TableIcon,
  Underline as UnderlineIcon,
  Undo2,
  Unlink,
} from "lucide-react";
import { FontSize } from "@/lib/tiptap/font-size";
import { ResizableImage } from "@/lib/tiptap/resizable-image";

const FONT_FAMILIES = [
  { label: "Police par défaut", value: "" },
  { label: "Cinzel — titres romains", value: "var(--font-display), Georgia, serif" },
  { label: "Cormorant — élégante", value: "var(--font-accent), Georgia, serif" },
  { label: "Lora — lecture", value: "var(--font-serif), Georgia, serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Times New Roman", value: "'Times New Roman', Times, serif" },
  { label: "Garamond", value: "Garamond, 'EB Garamond', 'Times New Roman', serif" },
  { label: "Palatino", value: "Palatino, 'Palatino Linotype', 'Book Antiqua', serif" },
  { label: "Arial", value: "Arial, Helvetica, sans-serif" },
  { label: "Helvetica", value: "Helvetica, Arial, sans-serif" },
  { label: "Verdana", value: "Verdana, Geneva, sans-serif" },
  { label: "Trebuchet MS", value: "'Trebuchet MS', Helvetica, sans-serif" },
  { label: "Tahoma", value: "Tahoma, Geneva, sans-serif" },
  { label: "Courier New — mono", value: "'Courier New', Courier, monospace" },
  { label: "Brush Script — manuscrite", value: "'Brush Script MT', 'Segoe Script', cursive" },
  { label: "Impact — display", value: "Impact, 'Arial Black', sans-serif" },
];

const FONT_SIZES = [
  { label: "Taille", value: "" },
  { label: "12", value: "12px" },
  { label: "14", value: "14px" },
  { label: "16", value: "16px" },
  { label: "18", value: "18px" },
  { label: "20", value: "20px" },
  { label: "24", value: "24px" },
  { label: "28", value: "28px" },
  { label: "32", value: "32px" },
  { label: "40", value: "40px" },
  { label: "48", value: "48px" },
];

const IMAGE_WIDTHS = ["25%", "50%", "75%", "100%"];

function ToolbarButton({
  onClick,
  active = false,
  disabled = false,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`flex h-9 min-w-9 items-center justify-center rounded-md px-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? "bg-bark text-cream"
          : "text-ink hover:bg-sand"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-6 w-px self-center bg-latte" aria-hidden="true" />;
}

function Toolbar({ editor }: { editor: Editor }) {
  const currentHeading = editor.isActive("heading", { level: 1 })
    ? "h1"
    : editor.isActive("heading", { level: 2 })
      ? "h2"
      : editor.isActive("heading", { level: 3 })
        ? "h3"
        : "p";

  const setHeading = (value: string) => {
    const chain = editor.chain().focus();
    if (value === "p") {
      chain.setParagraph().run();
    } else {
      chain
        .toggleHeading({ level: Number(value.replace("h", "")) as 1 | 2 | 3 })
        .run();
    }
  };

  const setLink = useCallback(() => {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt(
      "Adresse du lien (https://…)\nLaisser vide pour retirer le lien.",
      previous ?? ""
    );
    if (url === null) {
      return;
    }
    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
  }, [editor]);

  const textColor =
    (editor.getAttributes("textStyle").color as string | undefined) ?? "#3e2f23";

  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 rounded-t-xl border-b border-latte bg-cream/95 p-1.5 backdrop-blur">
      {/* Historique */}
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        label="Annuler"
      >
        <Undo2 size={18} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        label="Refaire"
      >
        <Redo2 size={18} />
      </ToolbarButton>

      <Divider />

      {/* Titres */}
      <select
        value={currentHeading}
        onChange={(e) => setHeading(e.target.value)}
        className="h-9 rounded-md border border-latte bg-white px-1.5 text-sm text-ink"
        aria-label="Style de paragraphe"
      >
        <option value="p">Paragraphe</option>
        <option value="h1">Titre 1</option>
        <option value="h2">Titre 2</option>
        <option value="h3">Titre 3</option>
      </select>

      {/* Police */}
      <select
        value={
          (editor.getAttributes("textStyle").fontFamily as string | undefined) ??
          ""
        }
        onChange={(e) => {
          if (e.target.value === "") {
            editor.chain().focus().unsetFontFamily().run();
          } else {
            editor.chain().focus().setFontFamily(e.target.value).run();
          }
        }}
        className="h-9 max-w-36 rounded-md border border-latte bg-white px-1.5 text-sm text-ink"
        aria-label="Famille de police"
      >
        {FONT_FAMILIES.map((font) => (
          <option key={font.label} value={font.value} style={{ fontFamily: font.value || undefined }}>
            {font.label}
          </option>
        ))}
      </select>

      {/* Taille */}
      <select
        value={
          (editor.getAttributes("textStyle").fontSize as string | undefined) ??
          ""
        }
        onChange={(e) => {
          if (e.target.value === "") {
            editor.chain().focus().unsetFontSize().run();
          } else {
            editor.chain().focus().setFontSize(e.target.value).run();
          }
        }}
        className="h-9 rounded-md border border-latte bg-white px-1.5 text-sm text-ink"
        aria-label="Taille de police"
      >
        {FONT_SIZES.map((size) => (
          <option key={size.label} value={size.value}>
            {size.label}
          </option>
        ))}
      </select>

      <Divider />

      {/* Texte basique */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive("bold")}
        label="Gras"
      >
        <Bold size={18} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive("italic")}
        label="Italique"
      >
        <Italic size={18} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive("underline")}
        label="Souligné"
      >
        <UnderlineIcon size={18} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive("strike")}
        label="Barré"
      >
        <Strikethrough size={18} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        active={editor.isActive("code")}
        label="Code inline"
      >
        <Code size={18} />
      </ToolbarButton>

      <Divider />

      {/* Couleur du texte */}
      <label
        className="flex h-9 cursor-pointer items-center gap-1 rounded-md px-1.5 hover:bg-sand"
        title="Couleur du texte"
      >
        <Palette size={18} className="text-ink" />
        <input
          type="color"
          value={textColor}
          onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
          className="h-5 w-6 cursor-pointer border-0 bg-transparent p-0"
          aria-label="Couleur du texte"
        />
      </label>
      {/* Surligneur */}
      <label
        className="flex h-9 cursor-pointer items-center gap-1 rounded-md px-1.5 hover:bg-sand"
        title="Couleur de surlignage"
      >
        <Highlighter size={18} className="text-ink" />
        <input
          type="color"
          value={
            (editor.getAttributes("highlight").color as string | undefined) ??
            "#fff3a3"
          }
          onChange={(e) =>
            editor.chain().focus().setHighlight({ color: e.target.value }).run()
          }
          className="h-5 w-6 cursor-pointer border-0 bg-transparent p-0"
          aria-label="Couleur de surlignage"
        />
      </label>
      <ToolbarButton
        onClick={() =>
          editor.chain().focus().unsetColor().unsetHighlight().run()
        }
        label="Retirer les couleurs"
      >
        <span className="text-xs font-semibold">⌫</span>
      </ToolbarButton>

      <Divider />

      {/* Alignement */}
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        active={editor.isActive({ textAlign: "left" })}
        label="Aligner à gauche"
      >
        <AlignLeft size={18} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        active={editor.isActive({ textAlign: "center" })}
        label="Centrer"
      >
        <AlignCenter size={18} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        active={editor.isActive({ textAlign: "right" })}
        label="Aligner à droite"
      >
        <AlignRight size={18} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        active={editor.isActive({ textAlign: "justify" })}
        label="Justifier"
      >
        <AlignJustify size={18} />
      </ToolbarButton>

      <Divider />

      {/* Listes */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive("bulletList")}
        label="Liste à puces"
      >
        <List size={18} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive("orderedList")}
        label="Liste numérotée"
      >
        <ListOrdered size={18} />
      </ToolbarButton>

      <Divider />

      {/* Lien */}
      <ToolbarButton
        onClick={setLink}
        active={editor.isActive("link")}
        label="Insérer un lien"
      >
        <Link2 size={18} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().unsetLink().run()}
        disabled={!editor.isActive("link")}
        label="Retirer le lien"
      >
        <Unlink size={18} />
      </ToolbarButton>

      <Divider />

      {/* Citation, séparateur, tableau */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={editor.isActive("blockquote")}
        label="Citation"
      >
        <Quote size={18} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        label="Séparateur horizontal"
      >
        <Minus size={18} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() =>
          editor
            .chain()
            .focus()
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run()
        }
        active={editor.isActive("table")}
        label="Insérer un tableau"
      >
        <TableIcon size={18} />
      </ToolbarButton>

      {/* Outils contextuels : tableau sélectionné */}
      {editor.isActive("table") && (
        <>
          <Divider />
          <ToolbarButton
            onClick={() => editor.chain().focus().addColumnAfter().run()}
            label="Ajouter une colonne"
          >
            <span className="px-1 text-xs font-semibold">+ Col</span>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().deleteColumn().run()}
            label="Supprimer la colonne"
          >
            <span className="px-1 text-xs font-semibold">− Col</span>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().addRowAfter().run()}
            label="Ajouter une ligne"
          >
            <span className="px-1 text-xs font-semibold">+ Ligne</span>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().deleteRow().run()}
            label="Supprimer la ligne"
          >
            <span className="px-1 text-xs font-semibold">− Ligne</span>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().deleteTable().run()}
            label="Supprimer le tableau"
          >
            <span className="px-1 text-xs font-semibold">✕ Tableau</span>
          </ToolbarButton>
        </>
      )}

      {/* Outils contextuels : image sélectionnée */}
      {editor.isActive("image") && (
        <>
          <Divider />
          <span className="px-1 text-xs text-mocha">Taille image :</span>
          {IMAGE_WIDTHS.map((width) => (
            <ToolbarButton
              key={width}
              onClick={() =>
                editor.chain().focus().updateAttributes("image", { width }).run()
              }
              active={editor.getAttributes("image").width === width}
              label={`Largeur ${width}`}
            >
              <span className="px-1 text-xs font-semibold">{width}</span>
            </ToolbarButton>
          ))}
        </>
      )}
    </div>
  );
}

export default function TiptapEditor({
  content,
  onChange,
  onReady,
}: {
  content: string;
  onChange: (html: string) => void;
  /** Expose l'instance de l'éditeur au parent (panneau médias séparé). */
  onReady?: (editor: Editor | null) => void;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),
      ResizableImage,
      Youtube.configure({
        nocookie: true,
        modestBranding: true,
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      TextStyle,
      FontFamily,
      FontSize,
      Color,
      Highlight.configure({ multicolor: true }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({
        placeholder: "Commencez à écrire votre article ici...",
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: "rich-text",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Expose l'éditeur au parent (et le retire au démontage)
  useEffect(() => {
    onReady?.(editor ?? null);
    return () => onReady?.(null);
  }, [editor, onReady]);

  // Libère l'éditeur quand le composant est démonté
  useEffect(() => {
    return () => {
      editor?.destroy();
    };
  }, [editor]);

  if (!editor) {
    return (
      <div className="flex min-h-96 items-center justify-center rounded-xl border border-latte bg-white">
        <Loader2 className="animate-spin text-mocha" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-latte bg-white shadow-sm">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
