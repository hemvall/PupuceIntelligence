"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowDownToLine,
  Plus,
  X,
  LoaderCircle,
  Check,
  RotateCcw,
  Square,
  WandSparkles,
} from "lucide-react";
import { DocumentEditor, imageData } from "./document-editor";
import {
  blankDocument,
  defaultOutline,
  documentSchema,
  generatedDocument,
  generationRequest,
  heading,
  paragraph,
  textOf,
  type ResearchDocument,
  type RichNode,
} from "@/lib/document/model";
import { DOSSIER_ID, dossierSections, dossierSources } from "@/lib/dossier";
import type { Project, Source } from "@/lib/types";
type Props = {
  project: Project;
  sources: Source[];
  accessKey: string;
  update: (fn: (p: Project) => Project) => void;
};
export function DocumentStudio({ project, sources, accessKey, update }: Props) {
  const [planning, setPlanning] = useState(!project.document),
    [preview, setPreview] = useState(false),
    [revision, setRevision] = useState(0),
    [starting, setStarting] = useState(false),
    [exporting, setExporting] = useState(""),
    [error, setError] = useState(""),
    [stopping, setStopping] = useState(false),
    [retry, setRetry] = useState(0);
  const write = useRef(update);
  write.current = update;
  const lock = useRef(false);
  const outline = project.documentOutline || defaultOutline;
  const fallback = useMemo(
    () => blankDocument(project.title),
    [project.id, project.title],
  );
  const current =
    preview && project.documentProposal
      ? project.documentProposal
      : project.document || fallback;
  function save(doc: ResearchDocument) {
    write.current((p) => ({
      ...p,
      document: { ...doc, updatedAt: new Date().toISOString() },
    }));
  }
  const job = project.documentJob;
  useEffect(() => {
    if (!job) return;
    let live = true,
      timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const response = await fetch(
          `/api/hermes/runs/${encodeURIComponent(job!.runId)}`,
          { headers: { "x-app-access-key": accessKey } },
        );
        const data = await response.json();
        if (!live) return;
        if (!response.ok)
          throw new Error(data.error || "Impossible de suivre la rédaction.");
        if (data.status === "completed") {
          let proposal: ResearchDocument;
          try {
            proposal = generatedDocument(
              typeof data.output === "string" ? data.output : "",
              job!.sources,
            );
            const candidates = job!.sources
              .filter(
                (s) =>
                  s.image &&
                  (/^https?:\/\//.test(s.image) ||
                    /^\/art\/[a-zA-Z0-9._-]+$/.test(s.image)),
              )
              .slice(0, 3);
            const pictures = await Promise.all(
              candidates.map(async (s) => {
                try {
                  const response = await fetch(s.image!, {
                    signal: AbortSignal.timeout(10000),
                  });
                  if (!response.ok) return null;
                  const src = await imageData(await response.blob());
                  return [
                    {
                      type: "image",
                      attrs: { src, alt: `${s.creator}, ${s.title}` },
                    },
                    paragraph(
                      `${s.creator}, ${s.title}, ${s.date}. ${s.institution}. ${s.rights || "Droits de reproduction à vérifier"}. Reproduction redimensionnée. ${s.url}`,
                    ),
                  ] as RichNode[];
                } catch {
                  return null;
                }
              }),
            );
            if (!live) return;
            const figures = pictures.flatMap((p) => p || []);
            if (figures.length) {
              const blocks = [...(proposal.content.content || [])];
              const bibliography = blocks.findIndex(
                (n) =>
                  n.type === "heading" &&
                  textOf(n) === "Bibliographie et documents consultés",
              );
              blocks.splice(
                bibliography < 0 ? blocks.length : bibliography,
                0,
                heading("Illustrations du corpus"),
                ...figures,
              );
              const illustrated = documentSchema.safeParse({
                ...proposal,
                content: { type: "doc", content: blocks },
              });
              if (illustrated.success) proposal = illustrated.data;
            }
          } catch (e) {
            write.current((p) => ({
              ...p,
              documentJob: undefined,
              documentError:
                e instanceof Error ? e.message : "Réponse non exploitable.",
            }));
            return;
          }
          write.current((p) => ({
            ...p,
            documentJob: undefined,
            documentProposal: proposal,
            documentError: undefined,
          }));
          setPreview(true);
          setRevision((r) => r + 1);
          return;
        }
        if (["failed", "cancelled", "interrupted"].includes(data.status)) {
          write.current((p) => ({
            ...p,
            documentJob: undefined,
            documentError:
              data.status === "cancelled"
                ? "Rédaction arrêtée. Ton document est conservé."
                : "La rédaction a été interrompue. Vérifie la connexion et le crédit du fournisseur avant de relancer.",
          }));
          return;
        }
        if (data.status === "unknown")
          throw new Error(
            "Hermes a redémarré pendant cette rédaction. Le résultat est incertain ; vérifie ce run dans Hermes avant de relancer.",
          );
        timer = setTimeout(poll, 2000);
      } catch (e) {
        if (live)
          setError(
            e instanceof Error
              ? e.message
              : "Connexion interrompue. Le suivi peut être repris.",
          );
      }
    }
    void poll();
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [job?.runId, accessKey, retry]);
  function setOutline(value: string[]) {
    write.current((p) => ({ ...p, documentOutline: value }));
  }
  async function generate() {
    if (lock.current || job) return;
    const clean = outline.map((x) => x.trim()).filter(Boolean);
    if (!clean.length) {
      setError("Ajoute au moins une partie à ton plan.");
      return;
    }
    if (!sources.length && !project.notes.trim()) {
      setError(
        "Sélectionne des sources ou ajoute des notes avant de demander un dossier documenté.",
      );
      return;
    }
    lock.current = true;
    setStarting(true);
    setError("");
    const request = generationRequest(
      project.title,
      clean,
      project.documentBrief || "",
      project.notes,
      sources,
    );
    const requestId = crypto.randomUUID();
    try {
      const response = await fetch("/api/hermes/runs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-app-access-key": accessKey,
        },
        body: JSON.stringify({
          message: request.message,
          context: request.context,
          sessionId: "pupuce-writing-" + crypto.randomUUID(),
          requestId,
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "La rédaction n’a pas pu démarrer.");
      if (typeof data.run_id !== "string")
        throw new Error("Identifiant de rédaction manquant.");
      write.current((p) => ({
        ...p,
        documentError: undefined,
        documentJob: {
          runId: data.run_id,
          requestId,
          startedAt: new Date().toISOString(),
          sources: request.snapshot,
        },
      }));
      setPlanning(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connexion indisponible.");
    } finally {
      lock.current = false;
      setStarting(false);
    }
  }
  async function stop() {
    if (!job) return;
    setStopping(true);
    try {
      const r = await fetch(
        `/api/hermes/runs/${encodeURIComponent(job.runId)}`,
        { method: "POST", headers: { "x-app-access-key": accessKey } },
      );
      if (!r.ok) throw new Error();
      setError("");
      setRetry((x) => x + 1);
    } catch {
      setError(
        "Impossible de confirmer l’arrêt. Reprends le suivi avant de relancer.",
      );
    } finally {
      setStopping(false);
    }
  }
  function create() {
    if (project.document) {
      setError(
        "Ton document existe déjà. Modifie ses titres directement dans la page ; une génération proposera un nouveau brouillon séparé.",
      );
      return;
    }
    save(
      blankDocument(
        project.title,
        outline.filter((x) => x.trim()),
      ),
    );
    setPlanning(false);
    setRevision((x) => x + 1);
  }
  async function example() {
    setStarting(true);
    setError("");
    try {
      const content = [
        paragraph(
          "Dossier de travail préparé à partir de sources identifiées. Les analyses sont des propositions de lecture ; les références non lues sont signalées.",
        ),
        ...dossierSections.flatMap((s) => [
          heading(s.title),
          paragraph(s.status),
          ...s.paragraphs.map(paragraph),
          paragraph("Références : " + s.sources.join(", ")),
        ]),
        heading("Bibliographie et documents consultés"),
        ...dossierSources.flatMap((s) => [
          paragraph(
            `${s.creator}. ${s.title}. ${s.date}. ${s.institution}. ${s.access}. ${s.description}`,
          ),
          paragraph(s.url),
        ]),
      ];
      const r = await fetch("/art/fallen-angel.jpg");
      if (!r.ok) throw new Error("Reproduction indisponible.");
      const src = await imageData(await r.blob());
      content.splice(
        1,
        0,
        {
          type: "image",
          attrs: { src, alt: "Alexandre Cabanel, L’Ange déchu, 1847" },
        },
        paragraph(
          "Alexandre Cabanel, L’Ange déchu, 1847. Musée Fabre. Photographie Rvalette, CC BY-SA 3.0. Reproduction redimensionnée. Source : https://commons.wikimedia.org/wiki/File:Cabanel-L%27ange_d%C3%A9chu.JPG — Licence : https://creativecommons.org/licenses/by-sa/3.0/",
        ),
      );
      const doc = documentSchema.parse({
        title: "L’Ange déchu d’Alexandre Cabanel",
        content: { type: "doc", content },
        origin: "example",
        updatedAt: new Date().toISOString(),
      });
      write.current((p) => ({
        ...p,
        document: doc,
        previousDocument: p.document,
      }));
      setRevision((x) => x + 1);
      setPlanning(false);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Impossible de préparer l’exemple.",
      );
    } finally {
      setStarting(false);
    }
  }
  async function exportFile(format: "docx" | "pdf") {
    setExporting(format);
    setError("");
    try {
      const response = await fetch("/api/documents/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document: current, format }),
      });
      if (!response.ok) {
        let message =
          "L’export est indisponible. Réduis la taille des images et réessaie.";
        try {
          message = (await response.json()).error || message;
        } catch {}
        throw new Error(message);
      }
      const blob = await response.blob(),
        url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = `${current.title.replace(/[^\p{L}\p{N}-]+/gu, "-").slice(0, 90)}.${format}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export indisponible.");
    } finally {
      setExporting("");
    }
  }
  const words = textOf(current.content)
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return (
    <section className="document-studio" aria-label="Rédaction du dossier">
      <div className="studio-actions">
        <div>
          <button
            className={planning ? "secondary active" : "secondary"}
            onClick={() => setPlanning(!planning)}
            aria-expanded={planning}
          >
            Structure et rédaction
          </button>
          {project.previousDocument && !preview && (
            <button
              className="text-button"
              onClick={() => {
                write.current((p) => ({
                  ...p,
                  document: p.previousDocument,
                  previousDocument: p.document,
                }));
                setRevision((r) => r + 1);
              }}
            >
              <RotateCcw size={14} />
              Version précédente
            </button>
          )}
        </div>
        <div>
          <button
            className="secondary"
            disabled={!!exporting}
            onClick={() => void exportFile("docx")}
          >
            {exporting === "docx" ? (
              <LoaderCircle size={14} className="spin" />
            ) : (
              <ArrowDownToLine size={14} />
            )}
            Word
          </button>
          <button
            className="secondary"
            disabled={!!exporting}
            onClick={() => void exportFile("pdf")}
          >
            {exporting === "pdf" ? (
              <LoaderCircle size={14} className="spin" />
            ) : (
              <ArrowDownToLine size={14} />
            )}
            PDF
          </button>
        </div>
      </div>
      {planning && (
        <div className="writing-plan">
          <div className="plan-intro">
            <h2>Un plan pour commencer</h2>
            <p>
              Réorganise les parties, précise tes consignes, puis écris toi-même
              ou confie un premier brouillon à l’assistant.
            </p>
            <label>
              Consignes de rédaction
              <textarea
                maxLength={3000}
                value={project.documentBrief || ""}
                onChange={(e) =>
                  write.current((p) => ({
                    ...p,
                    documentBrief: e.target.value,
                  }))
                }
                placeholder="Niveau d’étude, longueur souhaitée, problématique, consignes du cours…"
              />
            </label>
            <p className="plan-corpus">
              {sources.length} source{sources.length > 1 ? "s" : ""}{" "}
              sélectionnée{sources.length > 1 ? "s" : ""}. Les notices et
              extraits disponibles seront transmis ; un livre simplement
              référencé n’est pas un livre lu.
            </p>
          </div>
          <div className="plan-parts">
            {outline.map((title, i) => (
              <div className="plan-part" key={i}>
                <span>{String(i + 1).padStart(2, "0")}</span>
                <input
                  aria-label={`Partie ${i + 1}`}
                  value={title}
                  maxLength={250}
                  onChange={(e) =>
                    setOutline(
                      outline.map((t, j) => (i === j ? e.target.value : t)),
                    )
                  }
                />
                <button
                  className="icon-button"
                  aria-label={`Monter la partie ${i + 1}`}
                  disabled={i === 0}
                  onClick={() => {
                    const n = [...outline];
                    [n[i - 1], n[i]] = [n[i], n[i - 1]];
                    setOutline(n);
                  }}
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  className="icon-button"
                  aria-label={`Descendre la partie ${i + 1}`}
                  disabled={i === outline.length - 1}
                  onClick={() => {
                    const n = [...outline];
                    [n[i], n[i + 1]] = [n[i + 1], n[i]];
                    setOutline(n);
                  }}
                >
                  <ArrowDown size={14} />
                </button>
                <button
                  className="icon-button"
                  aria-label={`Retirer la partie ${i + 1}`}
                  disabled={outline.length < 2}
                  onClick={() => setOutline(outline.filter((_, j) => i !== j))}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            <button
              className="text-button"
              disabled={outline.length >= 12}
              onClick={() => setOutline([...outline, "Nouvelle partie"])}
            >
              <Plus size={14} />
              Ajouter une partie
            </button>
          </div>
          <div className="plan-submit">
            {!project.document && (
              <button className="secondary" onClick={create}>
                Créer la structure
              </button>
            )}
            <button
              className="primary"
              disabled={starting || !!job || !outline.some((s) => s.trim())}
              onClick={() => void generate()}
            >
              {starting ? (
                <LoaderCircle size={15} className="spin" />
              ) : (
                <WandSparkles size={15} />
              )}
              Rédiger le dossier complet
            </button>
            {project.id === DOSSIER_ID && !project.document && (
              <button
                className="text-button"
                disabled={starting}
                onClick={() => void example()}
              >
                Partir du dossier Cabanel
              </button>
            )}
            <span>La génération utilise ton fournisseur API.</span>
          </div>
        </div>
      )}
      {(job || starting) && (
        <div className="writing-progress" role="status">
          <LoaderCircle size={18} className="spin" />
          <div>
            <strong>
              {starting
                ? "Préparation de la rédaction…"
                : "L’assistant rédige le dossier"}
            </strong>
            <p>
              Le corpus, le plan et les consignes sont réunis. Tu peux continuer
              à modifier ton document ; le brouillon sera présenté séparément.
            </p>
          </div>
          {job && (
            <button
              className="text-button"
              disabled={stopping}
              onClick={() => void stop()}
            >
              <Square size={12} />
              {stopping ? "Arrêt demandé…" : "Arrêter"}
            </button>
          )}
        </div>
      )}
      {(error || project.documentError) && (
        <div className="alert" role="alert">
          {error || project.documentError}
          {job && (
            <button
              className="text-button"
              onClick={() => {
                setError("");
                setRetry((x) => x + 1);
              }}
            >
              Reprendre le suivi
            </button>
          )}
        </div>
      )}
      {project.documentProposal && (
        <div className="proposal-bar">
          <div>
            <strong>Un brouillon à relire</strong>
            <p>Vérifie les analyses et les références avant de le conserver.</p>
          </div>
          <button
            className="secondary"
            onClick={() => {
              setPreview(!preview);
              setRevision((x) => x + 1);
            }}
          >
            {preview ? "Revenir à mon document" : "Lire le brouillon"}
          </button>
          <button
            className="primary"
            onClick={() => {
              write.current((p) => ({
                ...p,
                document: p.documentProposal,
                previousDocument: p.document,
                documentProposal: undefined,
              }));
              setPreview(false);
              setRevision((x) => x + 1);
            }}
          >
            <Check size={14} />
            {project.document
              ? "Remplacer mon document"
              : "Adopter ce brouillon"}
          </button>
          <button
            className="icon-button"
            aria-label="Écarter le brouillon"
            onClick={() => {
              write.current((p) => ({ ...p, documentProposal: undefined }));
              setPreview(false);
              setRevision((x) => x + 1);
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}
      <DocumentEditor
        key={`${project.id}-${revision}-${preview ? "proposal" : "document"}`}
        document={current}
        readOnly={preview}
        sources={sources}
        onChange={(content) => save({ ...current, content })}
        onTitle={(title) => save({ ...current, title })}
      />
      <div className="document-foot">
        <span>
          {words.toLocaleString("fr-FR")} mots
          {preview
            ? " · aperçu du brouillon"
            : " · modifications conservées sur cet appareil"}
        </span>
        <span>Format A4 · images incorporées dans les exports</span>
      </div>
    </section>
  );
}
