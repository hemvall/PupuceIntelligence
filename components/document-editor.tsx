"use client";
import { useEditor, EditorContent, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { useRef, useState, useEffect } from "react";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Undo2,
  Redo2,
  ImagePlus,
  Quote,
  Link2,
  X,
} from "lucide-react";
import type { ResearchDocument, RichNode } from "@/lib/document/model";
import { richDocSchema, textOf } from "@/lib/document/model";
import type { Source } from "@/lib/types";
export async function imageData(file: Blob): Promise<string> {
  if (!["image/jpeg", "image/png"].includes(file.type) || file.size > 10000000)
    throw new Error("Choisis une image JPEG ou PNG de moins de 10 Mo.");
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1400 / bitmap.width, 1400 / bitmap.height, 1),
      canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Impossible de préparer l’image.");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    let result = canvas.toDataURL("image/jpeg", 0.84);
    if (result.length > 650000) result = canvas.toDataURL("image/jpeg", 0.62);
    if (result.length > 650000)
      throw new Error(
        "L’image reste trop lourde. Réduis sa taille avant de l’ajouter.",
      );
    return result;
  } finally {
    bitmap.close();
  }
}
const LocalImage = Image.extend({
  parseHTML() {
    return [
      {
        tag: "img[src]",
        getAttrs: (element) =>
          /^data:image\/(jpeg|png);base64,/.test(
            (element as HTMLElement).getAttribute("src") || "",
          )
            ? null
            : false,
      },
    ];
  },
});
export function DocumentEditor({
  document: doc,
  onChange,
  sources,
  readOnly = false,
  onTitle,
}: {
  document: ResearchDocument;
  onChange: (content: RichNode) => void;
  sources: Source[];
  readOnly?: boolean;
  onTitle?: (title: string) => void;
}) {
  const update = useRef(onChange);
  update.current = onChange;
  const [titleDraft, setTitleDraft] = useState(doc.title);
  useEffect(() => setTitleDraft(doc.title), [doc.title]);
  const [error, setError] = useState(""),
    [imagePanel, setImagePanel] = useState(false),
    [caption, setCaption] = useState(""),
    [pending, setPending] = useState(false),
    [linkPanel, setLinkPanel] = useState(false),
    [href, setHref] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    editable: !readOnly,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: false,
        code: false,
        link: {
          openOnClick: false,
          protocols: ["https", "http"],
          isAllowedUri: (url) => /^https?:\/\//i.test(url),
        },
      }),
      LocalImage.configure({ allowBase64: true }),
      Placeholder.configure({ placeholder: "Écrire, développer une idée…" }),
    ],
    content: doc.content as JSONContent,
    editorProps: {
      attributes: {
        "aria-label": readOnly ? "Aperçu du brouillon" : "Contenu du document",
        role: "textbox",
        "aria-multiline": "true",
        spellcheck: "true",
      },
      handleDrop: (_view, event) => {
        if (event.dataTransfer?.files.length) {
          event.preventDefault();
          setError(
            "Ajoute tes images avec le bouton Image pour renseigner leur légende.",
          );
          return true;
        }
        return false;
      },
      handlePaste: (_view, event) => {
        if (event.clipboardData?.files.length) {
          event.preventDefault();
          setImagePanel(true);
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      const parsed = richDocSchema.safeParse(editor.getJSON());
      if (parsed.success) {
        setError("");
        update.current(parsed.data);
      } else
        setError(
          "Ce document dépasse la taille autorisée ou contient une image non incorporée. Annule la dernière modification pour pouvoir le sauvegarder.",
        );
    },
  });
  useEffect(() => {
    editor?.setEditable(!readOnly, false);
  }, [readOnly, editor]);
  async function insert(file: Blob, credit = caption) {
    if (!editor) return;
    setPending(true);
    setError("");
    try {
      const src = await imageData(file);
      const content: JSONContent[] = [
        {
          type: "image",
          attrs: {
            src,
            alt: credit || "Illustration du dossier",
            title: credit || undefined,
          },
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: credit || "Légende, auteur, source et droits à renseigner.",
              marks: [{ type: "italic" }],
            },
          ],
        },
      ];
      const next = {
        type: "doc",
        content: [...(editor.getJSON().content || []), ...content],
      };
      richDocSchema.parse(next);
      editor.chain().focus().insertContent(content).run();
      setCaption("");
      setImagePanel(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Image indisponible.");
    } finally {
      setPending(false);
      if (input.current) input.current.value = "";
    }
  }
  async function sourceImage(s: Source) {
    if (!s.image) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch(s.image);
      if (!response.ok) throw new Error();
      await insert(
        await response.blob(),
        `${s.creator}, ${s.title}, ${s.date}. ${s.institution}. ${s.rights || "Droits à vérifier"}. ${s.url}`,
      );
    } catch {
      setError(
        "Cette institution ne permet pas l’import direct. Télécharge l’image depuis sa notice, puis utilise « Choisir une image ».",
      );
      setPending(false);
    }
  }
  if (!editor)
    return (
      <div className="editor-loading" role="status">
        Ouverture de la page…
      </div>
    );
  const tool = (
    label: string,
    icon: React.ReactNode,
    action: () => void,
    active = false,
    disabled = false,
  ) => (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={action}
      className={active ? "active" : ""}
    >
      {icon}
    </button>
  );
  const heads = (doc.content.content || []).filter((n) => n.type === "heading");
  function goHeading(index: number) {
    if (!editor) return;
    const instance = editor;
    let count = 0;
    instance.state.doc.descendants((node, pos) => {
      if (node.type.name === "heading") {
        if (count++ === index) {
          instance.commands.focus(pos + 1);
          const element = instance.view.nodeDOM(pos) as HTMLElement | null;
          element?.scrollIntoView({
            behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
              ? "auto"
              : "smooth",
            block: "center",
          });
          return false;
        }
      }
    });
  }
  return (
    <div className="manuscript-layout">
      <aside className="manuscript-index" aria-label="Sommaire du document">
        <strong>Sommaire</strong>
        {heads.map((n, i) => (
          <button key={i} onClick={() => goHeading(i)}>
            <span>{String(i + 1).padStart(2, "0")}</span>
            {textOf(n) || "Titre sans nom"}
          </button>
        ))}
      </aside>
      <div className="manuscript-main">
        {!readOnly && (
          <div className="editor-toolbar" aria-label="Mise en forme">
            <select
              aria-label="Style du paragraphe"
              value={
                editor.isActive("heading", { level: 1 })
                  ? "h1"
                  : editor.isActive("heading", { level: 2 })
                    ? "h2"
                    : editor.isActive("heading", { level: 3 })
                      ? "h3"
                      : "p"
              }
              onChange={(e) => {
                if (e.target.value === "p")
                  editor.chain().focus().setParagraph().run();
                else
                  editor
                    .chain()
                    .focus()
                    .setHeading({
                      level: Number(e.target.value.slice(1)) as 1 | 2 | 3,
                    })
                    .run();
              }}
            >
              <option value="p">Texte</option>
              <option value="h1">Titre 1</option>
              <option value="h2">Titre 2</option>
              <option value="h3">Titre 3</option>
            </select>
            <span className="tool-divider" />
            {tool(
              "Gras",
              <Bold size={16} />,
              () => {
                editor.chain().focus().toggleBold().run();
              },
              editor.isActive("bold"),
            )}
            {tool(
              "Italique",
              <Italic size={16} />,
              () => {
                editor.chain().focus().toggleItalic().run();
              },
              editor.isActive("italic"),
            )}
            {tool(
              "Souligné",
              <Underline size={16} />,
              () => {
                editor.chain().focus().toggleUnderline().run();
              },
              editor.isActive("underline"),
            )}
            {tool(
              "Liste à puces",
              <List size={17} />,
              () => {
                editor.chain().focus().toggleBulletList().run();
              },
              editor.isActive("bulletList"),
            )}
            {tool(
              "Liste numérotée",
              <ListOrdered size={17} />,
              () => {
                editor.chain().focus().toggleOrderedList().run();
              },
              editor.isActive("orderedList"),
            )}
            {tool(
              "Citation",
              <Quote size={16} />,
              () => {
                editor.chain().focus().toggleBlockquote().run();
              },
              editor.isActive("blockquote"),
            )}
            {tool(
              "Ajouter un lien",
              <Link2 size={16} />,
              () => {
                setHref(editor.getAttributes("link").href || "");
                setLinkPanel(!linkPanel);
              },
              editor.isActive("link"),
            )}
            <span className="tool-divider" />
            <button
              type="button"
              className="image-tool"
              onClick={() => setImagePanel(!imagePanel)}
              aria-expanded={imagePanel}
            >
              <ImagePlus size={16} />
              Image
            </button>
            <span className="toolbar-space" />
            {tool(
              "Annuler",
              <Undo2 size={16} />,
              () => {
                editor.chain().focus().undo().run();
              },
              false,
              !editor.can().undo(),
            )}
            {tool(
              "Rétablir",
              <Redo2 size={16} />,
              () => {
                editor.chain().focus().redo().run();
              },
              false,
              !editor.can().redo(),
            )}
          </div>
        )}
        {linkPanel && (
          <form
            className="editor-insert"
            onSubmit={(e) => {
              e.preventDefault();
              if (!href) {
                editor.chain().focus().unsetLink().run();
                setLinkPanel(false);
                return;
              }
              if (!/^https?:\/\//i.test(href)) {
                setError("Utilise une adresse https:// ou http://.");
                return;
              }
              editor
                .chain()
                .focus()
                .extendMarkRange("link")
                .setLink({ href })
                .run();
              setLinkPanel(false);
            }}
          >
            <label>
              Adresse du lien
              <input
                value={href}
                onChange={(e) => setHref(e.target.value)}
                placeholder="https://…"
              />
            </label>
            <button className="secondary">Appliquer</button>
            <button
              type="button"
              className="icon-button"
              aria-label="Fermer les liens"
              onClick={() => setLinkPanel(false)}
            >
              <X size={16} />
            </button>
          </form>
        )}
        {imagePanel && (
          <div className="editor-insert">
            <label>
              Légende et crédit
              <input
                maxLength={1800}
                placeholder="Auteur, œuvre, date, source et droits…"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
              />
            </label>
            <input
              ref={input}
              type="file"
              accept="image/png,image/jpeg"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void insert(file);
              }}
            />
            <button
              className="secondary"
              disabled={pending}
              onClick={() => input.current?.click()}
            >
              {pending ? "Préparation…" : "Choisir une image"}
            </button>
            <button
              className="icon-button"
              aria-label="Fermer les images"
              onClick={() => setImagePanel(false)}
            >
              <X size={16} />
            </button>
            {sources.some((s) => s.image) && (
              <div className="source-images">
                {sources
                  .filter((s) => s.image)
                  .map((s) => (
                    <button
                      key={s.id}
                      disabled={pending}
                      onClick={() => void sourceImage(s)}
                    >
                      <img src={s.image} alt="" />
                      {s.title}
                    </button>
                  ))}
              </div>
            )}
            <p>
              La légende sera modifiable sous l’image. Vérifie les droits de
              reproduction avant diffusion.
            </p>
          </div>
        )}
        {error && (
          <p className="alert" role="alert">
            {error}
          </p>
        )}
        <div className="manuscript-paper">
          {readOnly ? (
            <h1>{doc.title}</h1>
          ) : (
            <input
              className="manuscript-title"
              aria-label="Titre du document"
              maxLength={250}
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={() => onTitle?.(titleDraft.trim() || "Sans titre")}
            />
          )}
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
