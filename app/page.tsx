"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUp,
  BookOpen,
  Bookmark,
  Check,
  ChevronRight,
  CircleHelp,
  ExternalLink,
  FileText,
  Folder,
  GraduationCap,
  Landmark,
  Library,
  LoaderCircle,
  Menu,
  Moon,
  Plus,
  Search,
  Settings,
  Sparkles,
  Square,
  Sun,
  Upload,
  X,
} from "lucide-react";
import type { Project, Source, Workspace } from "@/lib/types";
import { initialWorkspace } from "@/lib/seed";
import { sourceLink, workspaceSchema } from "@/lib/workspace";
const STORAGE = "pupuce-workspace-v1";
const uid = () => crypto.randomUUID();
function download(name: string, content: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Picture({
  source,
  className = "",
}: {
  source: Source;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  return source.image && !failed ? (
    <img
      className={className}
      src={source.image}
      alt={source.title}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  ) : (
    <div className={`image-placeholder ${className}`}>
      <Landmark size={35} strokeWidth={1} />
      <span>{source.kind}</span>
    </div>
  );
}
export default function Home() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [area, setArea] = useState("research");
  const [tab, setTab] = useState("explore");
  const [kind, setKind] = useState("Tout");
  const searchToken = useRef(0);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [resultIds, setResultIds] = useState<string[] | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [detail, setDetail] = useState<Source | null>(null);
  const [modal, setModal] = useState<"project" | "settings" | "import" | null>(
    null,
  );
  const [projectName, setProjectName] = useState("");
  const [courseTitle, setCourseTitle] = useState("");
  const [courseText, setCourseText] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const sendLock = useRef(false);
  const [accessKey, setAccessKey] = useState("");
  const [chatError, setChatError] = useState("");
  const [pollPaused, setPollPaused] = useState(false);
  const [notice, setNotice] = useState("");
  const [saveError, setSaveError] = useState("");
  const [sidebar, setSidebar] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);
  const chatEnd = useRef<HTMLDivElement>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw) {
        const parsed = workspaceSchema.safeParse(JSON.parse(raw));
        if (parsed.success) {
          setWorkspace(parsed.data);
          return;
        }
        setSaveError(
          "La sauvegarde existante est invalide. Elle n’a pas été écrasée : exporte ou restaure ton dossier depuis les réglages.",
        );
        return;
      }
      setWorkspace(initialWorkspace());
    } catch {
      setSaveError(
        "Impossible de lire la sauvegarde locale. Vérifie les autorisations de ton navigateur.",
      );
    }
  }, []);
  useEffect(() => {
    if (!workspace) return;
    try {
      localStorage.setItem(STORAGE, JSON.stringify(workspace));
      setSaveError("");
    } catch {
      setSaveError(
        "La sauvegarde locale a échoué. Exporte ton dossier pour conserver ton travail.",
      );
    }
  }, [workspace]);
  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(""), 4500);
      return () => clearTimeout(timer);
    }
  }, [notice]);
  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [
    workspace?.projects.find((p) => p.id === workspace.activeProject)?.messages
      .length,
    chatError,
  ]);
  useEffect(() => {
    if (!modal && !detail) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    const focusable = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          'button:not([disabled]),a[href],input,textarea,select,[tabindex="0"]',
        ) || [],
      );
    focusable()[0]?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setModal(null);
        setDetail(null);
      }
      if (e.key === "Tab") {
        const list = focusable();
        const first = list[0],
          last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [modal, detail?.id]);
  const project = workspace?.projects.find(
    (p) => p.id === workspace.activeProject,
  );
  function updateProject(id: string, fn: (p: Project) => Project) {
    setWorkspace((w) =>
      w
        ? { ...w, projects: w.projects.map((p) => (p.id === id ? fn(p) : p)) }
        : w,
    );
  }
  const running = project?.activeRun;
  useEffect(() => {
    if (!running || !project || pollPaused) return;
    let live = true;
    let timer: ReturnType<typeof setTimeout>;
    const id = project.id;
    const run = running;
    async function poll() {
      try {
        const r = await fetch(`/api/hermes/runs/${encodeURIComponent(run)}`, {
          headers: { "x-app-access-key": accessKey },
        });
        const d = await r.json();
        if (!live) return;
        if (!r.ok) throw new Error(d.error || "Suivi indisponible.");
        if (
          ["completed", "failed", "cancelled", "interrupted"].includes(d.status)
        ) {
          updateProject(id, (p) => ({
            ...p,
            activeRun: undefined,
            activeRunMessageId: undefined,
            messages:
              d.status === "completed"
                ? [
                    ...p.messages,
                    {
                      id: uid(),
                      role: "assistant",
                      content:
                        typeof d.output === "string"
                          ? d.output
                          : "La recherche est terminée sans réponse textuelle.",
                    },
                  ]
                : p.messages,
          }));
          if (d.status !== "completed")
            setChatError(
              d.status === "cancelled"
                ? "Recherche arrêtée."
                : "La recherche a été interrompue. Tu peux relancer une demande.",
            );
          return;
        }
        if (d.status === "unknown") {
          setChatError(
            "Le service a redémarré pendant cette recherche. Demande à l’administrateur de vérifier son état avant de la relancer.",
          );
          setPollPaused(true);
          return;
        }
        timer = setTimeout(poll, 1800);
      } catch (e) {
        if (live) {
          setChatError(
            e instanceof Error ? e.message : "Connexion interrompue.",
          );
          setPollPaused(true);
        }
      }
    }
    poll();
    return () => {
      live = false;
      clearTimeout(timer);
    };
    // Run persistence allows tracking to resume when this dossier is reopened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, project?.id, accessKey, pollPaused]);
  function switchProject(id: string) {
    searchToken.current++;
    setSearching(false);
    setWorkspace((w) => (w ? { ...w, activeProject: id } : w));
    setArea("research");
    setTab("explore");
    setResultIds(null);
    setWarnings([]);
    setQuery("");
    setChatError("");
    setPollPaused(false);
    setSidebar(false);
  }
  function toggleSource(id: string) {
    if (project)
      updateProject(project.id, (p) => ({
        ...p,
        selected: p.selected.includes(id)
          ? p.selected.filter((s) => s !== id)
          : [...p.selected, id],
      }));
  }
  async function search(e?: React.FormEvent) {
    e?.preventDefault();
    if (!query.trim() || searching) return;
    const token = ++searchToken.current;
    setSearching(true);
    setWarnings([]);
    setTab("explore");
    try {
      const r = await fetch(
        `/api/search?q=${encodeURIComponent(query.trim())}`,
      );
      const d = await r.json();
      if (token !== searchToken.current) return;
      if (!r.ok && !d.sources)
        throw new Error(d.error || "Recherche indisponible.");
      const sources = d.sources as Source[];
      setWorkspace((w) =>
        w
          ? {
              ...w,
              sources: [
                ...w.sources.filter((s) => !sources.some((n) => n.id === s.id)),
                ...sources,
              ],
            }
          : w,
      );
      setResultIds(sources.map((s) => s.id));
      setWarnings(d.warnings || []);
    } catch (e) {
      if (token === searchToken.current)
        setWarnings([e instanceof Error ? e.message : "Erreur de recherche."]);
    } finally {
      if (token === searchToken.current) setSearching(false);
    }
  }
  async function send(text = draft) {
    if (!project || !text.trim() || sendLock.current || project.activeRun)
      return;
    sendLock.current = true;
    setSending(true);
    setDraft("");
    setChatError("");
    setPollPaused(false);
    const p = project;
    const messageId = uid();
    updateProject(p.id, (v) => ({
      ...v,
      messages: [
        ...v.messages,
        { id: messageId, role: "user", content: text.trim() },
      ],
    }));
    const selected = workspace!.sources.filter((s) =>
      p.selected.includes(s.id),
    );
    const contextSources = [];
    let contextSize = 0;
    for (const s of selected) {
      const item = {
        id: s.id,
        title: s.title,
        creator: s.creator,
        url: s.url,
        access: s.access,
        text: s.text?.slice(0, 6000),
        description: s.description,
      };
      const size = JSON.stringify(item).length;
      if (contextSize + size > 34000) break;
      contextSources.push(item);
      contextSize += size;
    }
    const context = JSON.stringify({
      project: p.title,
      notes: p.notes.slice(0, 8000),
      sources: contextSources,
      omittedSources: selected.length - contextSources.length,
      notice:
        "Extraits limités à 6 000 caractères par cours. Le document complet peut ne pas être présent.",
    });
    try {
      const r = await fetch("/api/hermes/runs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-app-access-key": accessKey,
        },
        body: JSON.stringify({
          message: text.trim(),
          sessionId: p.sessionId,
          requestId: messageId,
          context,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Lancement impossible.");
      updateProject(p.id, (v) => ({
        ...v,
        activeRun: d.run_id,
        activeRunMessageId: messageId,
      }));
    } catch (e) {
      setChatError(e instanceof Error ? e.message : "Connexion indisponible.");
    } finally {
      sendLock.current = false;
      setSending(false);
    }
  }
  async function stopRun() {
    if (!project?.activeRun) return;
    try {
      const r = await fetch(
        `/api/hermes/runs/${encodeURIComponent(project.activeRun)}`,
        { method: "POST", headers: { "x-app-access-key": accessKey } },
      );
      if (!r.ok) throw new Error();
      setPollPaused(false);
      setChatError("");
      setNotice("Arrêt de la recherche demandé.");
    } catch {
      setChatError(
        "Impossible de confirmer l’arrêt. Vérifie la connexion avant de réessayer.",
      );
    }
  }
  function addProject(e: React.FormEvent) {
    e.preventDefault();
    if (!projectName.trim()) return;
    searchToken.current++;
    setSearching(false);
    const id = uid();
    setWorkspace((w) =>
      w
        ? {
            ...w,
            activeProject: id,
            projects: [
              ...w.projects,
              {
                id,
                title: projectName.trim(),
                subtitle: "Dossier de recherche",
                selected: [],
                notes: "",
                messages: [],
                sessionId: "pupuce-" + uid(),
              },
            ],
          }
        : w,
    );
    setProjectName("");
    setModal(null);
    setArea("research");
    setTab("explore");
    setResultIds(null);
    setQuery("");
    setWarnings([]);
    setPollPaused(false);
    setChatError("");
  }
  function importCourse(e: React.FormEvent) {
    e.preventDefault();
    if (!project || !courseTitle.trim() || !courseText.trim()) return;
    const id = "course-" + uid();
    const source: Source = {
      id,
      title: courseTitle.trim(),
      creator: "Document personnel",
      date: new Date().getFullYear().toString(),
      kind: "Cours",
      institution: "Mes cours",
      url: "",
      description: courseText.trim().slice(0, 180),
      text: courseText.trim(),
      access: "Texte importé",
      retrievedAt: new Date().toISOString(),
    };
    setWorkspace((w) =>
      w
        ? {
            ...w,
            sources: [...w.sources, source],
            projects: w.projects.map((p) =>
              p.id === project.id ? { ...p, selected: [...p.selected, id] } : p,
            ),
          }
        : w,
    );
    setModal(null);
    setCourseTitle("");
    setCourseText("");
    setNotice("Cours ajouté au dossier.");
  }
  function exportProject() {
    if (!project || !workspace) return;
    const sources = workspace.sources.filter((s) =>
      project.selected.includes(s.id),
    );
    const text = `# ${project.title}\n\n${project.subtitle}\n\n## Notes et plan\n\n${project.notes || "Aucune note."}\n\n## Corpus\n\n${sources.map((s, i) => `${i + 1}. **${s.title}** — ${s.creator}${s.date ? `, ${s.date}` : ""}. ${s.institution}.\n   ${s.url || "Document personnel"}\n   Accès : ${s.access}. Notice récupérée le ${s.retrievedAt.slice(0, 10)}.${s.rights ? ` Droits : ${s.rights}.` : ""}\n   ${s.inventory ? `Inventaire : ${s.inventory}.` : ""}\n   ${s.text ? `\n${s.text}\n` : ""}`).join("\n\n")}\n\n## Échanges avec l’assistant\n\n${project.messages.map((m) => `### ${m.role === "user" ? "Ma demande" : "Assistant — à vérifier"}\n\n${m.content}`).join("\n\n")}`;
    download("pupuce-dossier.md", text, "text/markdown");
    setNotice("Dossier exporté en Markdown.");
  }
  async function restore(file?: File) {
    if (!file) return;
    try {
      if (file.size > 15_000_000)
        throw new Error("Fichier trop volumineux (15 Mo maximum).");
      const parsed = workspaceSchema.safeParse(JSON.parse(await file.text()));
      if (!parsed.success)
        throw new Error("Ce fichier n’est pas une sauvegarde Pupuce valide.");
      setWorkspace(parsed.data);
      setModal(null);
      setDetail(null);
      setResultIds(null);
      setChatError("");
      setNotice("Sauvegarde restaurée.");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Import impossible.");
    } finally {
      if (uploadRef.current) uploadRef.current.value = "";
    }
  }
  if (!workspace || !project)
    return (
      <main className="loading">
        <Landmark size={34} />
        <h1>Pupuce Intelligence</h1>
        <p>{saveError || "Ouverture de ton atelier…"}</p>
        {saveError && (
          <>
            <button onClick={() => uploadRef.current?.click()}>
              Restaurer une sauvegarde
            </button>
            <input
              ref={uploadRef}
              type="file"
              accept="application/json"
              hidden
              onChange={(e) => restore(e.target.files?.[0])}
            />
          </>
        )}
      </main>
    );
  const selected = workspace.sources.filter((s) =>
    project.selected.includes(s.id),
  );
  const base =
    area === "library"
      ? workspace.sources
      : area === "revisions"
        ? workspace.sources.filter((s) => s.kind === "Cours")
        : tab === "selection"
          ? selected
          : resultIds
            ? workspace.sources.filter((s) => resultIds.includes(s.id))
            : workspace.sources.filter((s) => s.kind !== "Cours");
  const visible = base.filter((s) => kind === "Tout" || s.kind === kind);
  const artworks = visible.filter((s) => s.kind === "Œuvre");
  const documents = visible.filter((s) => s.kind !== "Œuvre");
  return (
    <div className="app" data-theme={workspace.theme}>
      <svg className="filters" aria-hidden="true">
        <filter id="paper-noise">
          <feTurbulence
            type="fractalNoise"
            baseFrequency=".82"
            numOctaves="3"
            stitchTiles="stitch"
          />
        </filter>
      </svg>
      {sidebar && (
        <button
          className="sidebar-scrim"
          aria-label="Fermer la navigation"
          onClick={() => setSidebar(false)}
        />
      )}
      <aside className={`sidebar ${sidebar ? "is-open" : ""}`}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setArea("research");
          }}
        >
          <div className="brand-mark">
            <Landmark size={27} strokeWidth={1.2} />
          </div>
          <div>
            <strong>
              Pupuce<span>®</span>
            </strong>
            <small>INTELLIGENCE</small>
          </div>
        </a>
        <button className="new-project" onClick={() => setModal("project")}>
          <Plus size={15} /> Nouvelle recherche <span>↗</span>
        </button>
        <div className="nav-label">MON ATELIER</div>
        <nav aria-label="Navigation principale">
          {[
            { id: "research", label: "Recherches", icon: Search },
            { id: "library", label: "Bibliothèque", icon: Library },
            { id: "revisions", label: "Révisions", icon: GraduationCap },
          ].map((n) => (
            <button
              key={n.id}
              className={area === n.id ? "active" : ""}
              onClick={() => {
                setArea(n.id);
                setKind("Tout");
                setSidebar(false);
              }}
            >
              <n.icon size={16} />
              {n.label}
              {n.id === "library" && (
                <span className="nav-count">{workspace.sources.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="nav-label folder-label">
          MES DOSSIERS{" "}
          <button
            className="icon-button"
            aria-label="Créer un dossier"
            onClick={() => setModal("project")}
          >
            <Plus size={13} />
          </button>
        </div>
        <nav className="folders" aria-label="Dossiers de recherche">
          {workspace.projects.map((p) => (
            <button
              key={p.id}
              className={p.id === project.id ? "folder-active" : ""}
              onClick={() => switchProject(p.id)}
            >
              <Folder size={15} />
              <span>{p.title}</span>
              {p.activeRun && <span className="running-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="atelier-seal">
            <Landmark size={36} strokeWidth={0.7} />
            <span>ARS · MEMORIA · STUDIUM</span>
          </div>
          <button className="account" onClick={() => setModal("settings")}>
            <span className="avatar">P</span>
            <span>
              Mon espace<small>Atelier personnel</small>
            </span>
            <Settings size={15} />
          </button>
        </div>
      </aside>
      <div className="workspace-shell">
        <header className="topbar">
          <div>
            <button
              className="icon-button mobile-menu"
              aria-label="Ouvrir la navigation"
              onClick={() => setSidebar(true)}
            >
              <Menu size={18} />
            </button>
            <Landmark size={14} />
            <span>Mon atelier</span>
            <ChevronRight size={12} />
            <span className="breadcrumb-current">
              {area === "research"
                ? "Recherche documentaire"
                : area === "library"
                  ? "Bibliothèque"
                  : "Révisions"}
            </span>
          </div>
          <div>
            <span className="saved-status">
              <span className={saveError ? "error-dot" : "saved-dot"} />
              {saveError
                ? "Sauvegarde à vérifier"
                : "Enregistré sur cet appareil"}
            </span>
            <button
              className="icon-button"
              aria-label={
                workspace.theme === "light"
                  ? "Activer le thème sombre"
                  : "Activer le thème clair"
              }
              onClick={() =>
                setWorkspace((w) =>
                  w
                    ? { ...w, theme: w.theme === "light" ? "dark" : "light" }
                    : w,
                )
              }
            >
              {workspace.theme === "light" ? (
                <Moon size={15} />
              ) : (
                <Sun size={15} />
              )}
            </button>
            <button
              className="icon-button"
              aria-label="Réglages et aide"
              onClick={() => setModal("settings")}
            >
              <CircleHelp size={16} />
            </button>
          </div>
        </header>
        <div className="desk">
          <main className="research-main">
            <div className="project-heading">
              <div>
                <div className="eyebrow">
                  <span />{" "}
                  {area === "research"
                    ? project.subtitle
                    : area === "library"
                      ? "Votre collection documentaire"
                      : "Apprendre, comprendre, retenir"}
                </div>
                <h1>
                  {area === "research"
                    ? project.title
                    : area === "library"
                      ? "La bibliothèque"
                      : "Les révisions"}
                  <span className="title-period">.</span>
                </h1>
                <p>
                  {area === "research"
                    ? "Des premières pistes aux idées qui prennent forme."
                    : area === "library"
                      ? "Les références retrouvées et les documents que vous avez importés."
                      : "Importez un cours, puis préparez vos fiches avec l’assistant."}
                </p>
              </div>
              <button
                className="secondary export-button"
                onClick={exportProject}
              >
                <ArrowDownToLine size={14} />
                <span>Exporter</span>
              </button>
            </div>
            {saveError && (
              <div role="alert" className="alert">
                {saveError}
              </div>
            )}
            {area === "research" && (
              <div
                className="tabs"
                role="tablist"
                aria-label="Étapes de recherche"
              >
                {[
                  { id: "explore", label: "Explorer", icon: Search },
                  { id: "selection", label: "Ma sélection", icon: Bookmark },
                  { id: "notes", label: "Notes & plan", icon: FileText },
                ].map((t) => (
                  <button
                    role="tab"
                    aria-selected={tab === t.id}
                    key={t.id}
                    className={tab === t.id ? "selected" : ""}
                    onClick={() => {
                      setTab(t.id);
                      setKind("Tout");
                    }}
                  >
                    <t.icon size={14} />
                    {t.label}
                    {t.id === "selection" && <span>{selected.length}</span>}
                  </button>
                ))}
              </div>
            )}
            {tab === "notes" && area === "research" ? (
              <section className="notes-page">
                <div className="section-heading">
                  <h2>Le carnet de recherche</h2>
                  <span className="micro">Dossier personnel</span>
                </div>
                <p className="muted">
                  Posez votre problématique, organisez vos idées et gardez les
                  références utiles à proximité.
                </p>
                <textarea
                  aria-label="Notes et plan du dossier"
                  className="notes-editor"
                  placeholder={
                    "Problématique\n\nI. Un premier axe…\n\nII. Une mise en perspective…\n\nRéférences et passages à vérifier"
                  }
                  value={project.notes}
                  onChange={(e) =>
                    updateProject(project.id, (p) => ({
                      ...p,
                      notes: e.target.value,
                    }))
                  }
                />
                <div className="notes-footer">
                  <span>
                    <Check size={12} /> Sauvegarde locale automatique
                  </span>
                  <button
                    className="text-button"
                    onClick={() => {
                      setAssistantOpen(true);
                      send(
                        "Propose un plan d’oral à partir de mes notes et du corpus sélectionné. Distingue les points établis des éléments restant à vérifier.",
                      );
                    }}
                  >
                    Travailler ce plan avec l’assistant <ArrowRight size={13} />
                  </button>
                </div>
              </section>
            ) : (
              <>
                {area === "research" && tab === "explore" && (
                  <>
                    <form className="search-form" onSubmit={search}>
                      <Search size={18} />
                      <input
                        aria-label="Sujet de recherche"
                        value={query}
                        maxLength={160}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Une œuvre, un artiste, une question…"
                      />
                      <button
                        type="submit"
                        className="primary"
                        disabled={searching || !query.trim()}
                      >
                        {searching ? (
                          <LoaderCircle size={15} className="spin" />
                        ) : (
                          <ArrowRight size={16} />
                        )}
                        <span>{searching ? "Recherche…" : "Rechercher"}</span>
                      </button>
                    </form>
                    <div className="search-caption">
                      <span>Notices du Met & ouvrages Open Library</span>
                      <button
                        className="text-button"
                        onClick={() => setModal("import")}
                      >
                        <Plus size={12} /> Ajouter un cours
                      </button>
                    </div>
                  </>
                )}
                {warnings.map((w) => (
                  <div key={w} className="alert" role="alert">
                    {w}
                  </div>
                ))}
                <div className="filter-row">
                  <div className="chips">
                    {["Tout", "Œuvre", "Ouvrage", "Portail", "Cours"]
                      .filter(
                        (k) =>
                          area !== "revisions" || k === "Tout" || k === "Cours",
                      )
                      .map((k) => (
                        <button
                          key={k}
                          aria-pressed={kind === k}
                          className={kind === k ? "active" : ""}
                          onClick={() => setKind(k)}
                        >
                          {k === "Tout"
                            ? "Tout"
                            : k === "Œuvre"
                              ? "Œuvres"
                              : k === "Ouvrage"
                                ? "Ouvrages"
                                : k === "Portail"
                                  ? "Portails"
                                  : "Cours"}
                        </button>
                      ))}
                  </div>
                  <span className="micro result-count">
                    {visible.length} ressource{visible.length !== 1 ? "s" : ""}
                  </span>
                </div>
                {area === "research" && tab === "explore" && !resultIds && (
                  <section className="exhibition">
                    <div className="exhibition-image">
                      <img
                        src="/art/socrates.jpg"
                        alt="La Mort de Socrate, Jacques Louis David, 1787"
                      />
                      <div className="dither" />
                    </div>
                    <div className="exhibition-copy">
                      <span className="eyebrow">
                        LE CABINET D’ÉTUDE · Nº 01
                      </span>
                      <h2>
                        Un regard neuf
                        <br />
                        sur les mondes anciens.
                      </h2>
                      <p>
                        Rassembler les œuvres. Croiser les regards.
                        <br />
                        Faire émerger votre propre lecture.
                      </p>
                      <button
                        className="text-button"
                        onClick={() => {
                          const s = workspace.sources.find(
                            (s) => s.id === "met-436105",
                          );
                          if (s) setDetail(s);
                        }}
                      >
                        Étudier la notice <ArrowRight size={14} />
                      </button>
                    </div>
                    <span className="exhibition-credit">
                      J. L. David · 1787 · The Met · CC0
                    </span>
                  </section>
                )}
                {searching && (
                  <div className="search-progress" role="status">
                    <LoaderCircle size={17} className="spin" />
                    <span>
                      Consultation des catalogues…
                      <small>
                        Les notices seront affichées avec leur provenance.
                      </small>
                    </span>
                  </div>
                )}
                {!searching && visible.length === 0 && (
                  <div className="empty-state">
                    <Bookmark size={30} strokeWidth={1} />
                    <h2>
                      {area === "revisions"
                        ? "Un cours, de nouvelles idées."
                        : tab === "selection"
                          ? "Votre corpus commence ici."
                          : "Aucune ressource pour le moment."}
                    </h2>
                    <p>
                      {area === "revisions"
                        ? "Ajoutez le texte de votre cours pour le conserver et le travailler avec l’assistant."
                        : tab === "selection"
                          ? "Conservez les références utiles avec le marque-page. Vous pourrez ensuite les comparer et préparer votre oral."
                          : "Essayez un autre mot-clé, une variante en anglais, ou un autre type de document."}
                    </p>
                    {area === "revisions" ? (
                      <button
                        className="primary"
                        onClick={() => setModal("import")}
                      >
                        <Plus size={15} />
                        Importer un cours
                      </button>
                    ) : (
                      <button
                        className="secondary"
                        onClick={() => {
                          setKind("Tout");
                          setTab("explore");
                        }}
                      >
                        Explorer les ressources <ArrowRight size={14} />
                      </button>
                    )}
                  </div>
                )}
                {artworks.length > 0 && (
                  <section className="results-section">
                    <div className="section-heading">
                      <h2>Les œuvres</h2>
                      <span className="micro">Reproductions & notices</span>
                    </div>
                    <div className="art-grid">
                      {artworks.map((s) => (
                        <article className="art-card" key={s.id}>
                          <div className="art-image">
                            <button
                              className="image-open"
                              onClick={() => setDetail(s)}
                              aria-label={`Examiner ${s.title}`}
                            >
                              <Picture source={s} />
                            </button>
                            <button
                              className={`bookmark ${project.selected.includes(s.id) ? "bookmarked" : ""}`}
                              aria-label={`${project.selected.includes(s.id) ? "Retirer" : "Conserver"} ${s.title}`}
                              aria-pressed={project.selected.includes(s.id)}
                              onClick={() => toggleSource(s.id)}
                            >
                              <Bookmark size={16} />
                            </button>
                            <span className="art-index">
                              {String(artworks.indexOf(s) + 1).padStart(2, "0")}
                            </span>
                          </div>
                          <button
                            className="card-title"
                            onClick={() => setDetail(s)}
                          >
                            {s.title}
                          </button>
                          <p>
                            {s.creator}
                            {s.date && ` · ${s.date}`}
                          </p>
                          <div className="card-meta">
                            <span className="source-dot" />
                            {s.institution === "The Metropolitan Museum of Art"
                              ? "The Met"
                              : s.institution}
                            <span className="license">
                              {s.rights?.split(" · ")[0] || "Notice"}
                            </span>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                )}
                {documents.length > 0 && (
                  <section className="results-section">
                    <div className="section-heading">
                      <h2>
                        {area === "revisions"
                          ? "Mes cours"
                          : documents.every((d) => d.kind === "Portail")
                            ? "Les portes d’entrée"
                            : "Documents & références"}
                      </h2>
                      <button
                        className="text-button"
                        onClick={() => setModal("import")}
                      >
                        <Plus size={12} /> Ajouter
                      </button>
                    </div>
                    <div className="document-list">
                      {documents.map((s) => (
                        <article className="document" key={s.id}>
                          <button
                            className={`document-icon ${s.kind === "Portail" ? "portal-icon" : ""}`}
                            aria-label={`Examiner ${s.title}`}
                            onClick={() => setDetail(s)}
                          >
                            {s.image ? (
                              <Picture source={s} />
                            ) : s.kind === "Portail" ? (
                              <Landmark size={22} strokeWidth={1.1} />
                            ) : (
                              <BookOpen size={22} strokeWidth={1.1} />
                            )}
                          </button>
                          <div className="document-content">
                            <div className="document-kicker">
                              {s.kind} <span>·</span> {s.institution}
                            </div>
                            <button
                              className="document-title"
                              onClick={() => setDetail(s)}
                            >
                              {s.title}
                            </button>
                            <p>
                              {s.kind === "Ouvrage"
                                ? `${s.creator}${s.date ? ` · ${s.date}` : ""} · Texte non consulté`
                                : s.description}
                            </p>
                          </div>
                          <button
                            className={`icon-button save-document ${project.selected.includes(s.id) ? "bookmarked" : ""}`}
                            aria-label={`${project.selected.includes(s.id) ? "Retirer" : "Conserver"} ${s.title}`}
                            aria-pressed={project.selected.includes(s.id)}
                            onClick={() => toggleSource(s.id)}
                          >
                            <Bookmark size={15} />
                          </button>
                          <button
                            className="icon-button"
                            aria-label={`Détails de ${s.title}`}
                            onClick={() => setDetail(s)}
                          >
                            <ChevronRight size={17} />
                          </button>
                        </article>
                      ))}
                    </div>
                  </section>
                )}
                {area === "revisions" && documents.length > 0 && (
                  <div className="revision-actions">
                    <button
                      className="secondary"
                      onClick={() => {
                        setAssistantOpen(true);
                        send(
                          "Prépare une fiche de révision à partir des cours sélectionnés. Cite les sections et n’ajoute pas de faits absents des documents. Si aucun cours n’est sélectionné, demande-moi d’en choisir un.",
                        );
                      }}
                    >
                      <GraduationCap size={15} />
                      Créer une fiche avec l’assistant
                    </button>
                    <p className="micro">
                      Les cours doivent être sélectionnés dans le dossier actif.
                    </p>
                  </div>
                )}
              </>
            )}
            <footer className="main-footer">
              <span className="footer-ornament">✳</span>
              <span>La recherche commence par une bonne question.</span>
              <span>PUPUCE · ATELIER DOCUMENTAIRE</span>
            </footer>
          </main>
          <aside
            className={`assistant-panel ${assistantOpen ? "assistant-open" : ""}`}
            aria-label="Assistant de recherche"
          >
            <div className="assistant-header">
              <div className="assistant-symbol">
                <Sparkles size={17} strokeWidth={1.3} />
              </div>
              <div>
                <h2>Le compagnon d’étude</h2>
                <span>À vos côtés, source après source.</span>
              </div>
              <button
                className="icon-button close-assistant"
                aria-label="Fermer l’assistant"
                onClick={() => setAssistantOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="assistant-context">
              <Folder size={12} />
              <span>{project.title}</span>
              <span>
                {selected.length} source{selected.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="chat-scroll">
              {project.messages.length === 0 ? (
                <div className="assistant-welcome">
                  <div className="companion-emblem">
                    <Landmark size={40} strokeWidth={0.8} />
                    <div className="emblem-dither" />
                  </div>
                  <span className="eyebrow">CHAQUE IDÉE A UNE HISTOIRE</span>
                  <h3>
                    Par où
                    <br />
                    commençons-nous ?
                  </h3>
                  <p>
                    Un sujet à explorer, des œuvres à rapprocher, un oral à
                    préparer. Construisons votre recherche ensemble.
                  </p>
                  <div className="prompt-list">
                    {[
                      "M’aider à préciser mon sujet",
                      "Comparer les sources sélectionnées",
                      "Construire un plan d’oral",
                    ].map((t) => (
                      <button
                        key={t}
                        disabled={sending || !!running}
                        onClick={() => send(t)}
                      >
                        {t}
                        <ArrowUp size={14} />
                      </button>
                    ))}
                  </div>
                  <div className="integrity-note">
                    <BookOpen size={14} />
                    <span>
                      Une notice est une piste.
                      <br />
                      Une affirmation demande une preuve.
                    </span>
                  </div>
                </div>
              ) : (
                project.messages.map((m) => (
                  <div className={`message ${m.role}`} key={m.id}>
                    <div className="message-label">
                      {m.role === "user" ? "VOUS" : "LE COMPAGNON"}
                      {m.role === "assistant" && <Sparkles size={11} />}
                    </div>
                    <div className="message-body">{m.content}</div>
                  </div>
                ))
              )}
              {(sending || running) && !pollPaused && (
                <div className="chat-progress" role="status">
                  <LoaderCircle size={14} className="spin" />
                  <span>
                    {sending
                      ? "Connexion à l’atelier…"
                      : "Le compagnon travaille sur votre demande…"}
                  </span>
                </div>
              )}
              {chatError && (
                <div className="chat-error" role="alert">
                  <p>{chatError}</p>
                  {running && (
                    <button
                      className="text-button"
                      onClick={() => {
                        setChatError("");
                        setPollPaused(false);
                      }}
                    >
                      Reprendre le suivi <ArrowRight size={12} />
                    </button>
                  )}
                  {!running && (
                    <button
                      className="text-button"
                      onClick={() => setModal("settings")}
                    >
                      Ouvrir les réglages <ArrowRight size={12} />
                    </button>
                  )}
                </div>
              )}
              <div ref={chatEnd} />
            </div>
            <div className="composer-area">
              <button
                className="corpus-pill"
                onClick={() => {
                  setArea("research");
                  setTab("selection");
                  setAssistantOpen(false);
                }}
              >
                <Library size={13} />
                <span>Mon corpus</span>
                <span>
                  {selected.length} ressource{selected.length !== 1 ? "s" : ""}
                </span>
                <ChevronRight size={12} />
              </button>
              <form
                className="composer"
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
              >
                <textarea
                  aria-label="Message à l’assistant"
                  placeholder="Une question, une nouvelle piste…"
                  value={draft}
                  maxLength={12000}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                />
                <div>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label="Ajouter un cours au dossier"
                    onClick={() => setModal("import")}
                  >
                    <Plus size={17} />
                  </button>
                  <span>Corpus sélectionné · extraits limités</span>
                  {running ? (
                    <button
                      type="button"
                      className="send"
                      aria-label="Arrêter la recherche"
                      onClick={stopRun}
                    >
                      <Square size={12} />
                    </button>
                  ) : (
                    <button
                      className="send"
                      type="submit"
                      aria-label="Envoyer le message"
                      disabled={!draft.trim() || sending}
                    >
                      <ArrowUp size={17} />
                    </button>
                  )}
                </div>
              </form>
              <p className="composer-footnote">
                Les réponses et interprétations restent à vérifier.
              </p>
            </div>
          </aside>
        </div>
      </div>
      <button
        className="assistant-toggle"
        onClick={() => setAssistantOpen((v) => !v)}
      >
        <Sparkles size={17} /> Compagnon d’étude
      </button>
      {detail && (
        <div className="modal-backdrop" onClick={() => setDetail(null)}>
          <section
            className="modal source-detail"
            role="dialog"
            aria-modal="true"
            aria-labelledby="source-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="icon-button modal-close"
              aria-label="Fermer la notice"
              onClick={() => setDetail(null)}
            >
              <X size={19} />
            </button>
            {detail.image && (
              <Picture source={detail} className="detail-image" />
            )}
            <div className="eyebrow">
              {detail.kind} · {detail.institution}
            </div>
            <h2 id="source-title">{detail.title}</h2>
            <p>
              {detail.creator}
              {detail.date ? ` · ${detail.date}` : ""}
            </p>
            <div className="access-label">
              <Check size={13} />
              {detail.access}
            </div>
            <p className="detail-description">{detail.description}</p>
            {detail.inventory && (
              <p className="micro">Inventaire : {detail.inventory}</p>
            )}
            {detail.rights && (
              <p className="micro">Reproduction : {detail.rights}</p>
            )}
            <p className="micro">
              Notice récupérée le {detail.retrievedAt.slice(0, 10)}. Les
              attributions doivent être vérifiées dans la notice d’origine.
            </p>
            {detail.text && <pre className="course-preview">{detail.text}</pre>}
            <div className="detail-actions">
              <button
                className="primary"
                onClick={() => toggleSource(detail.id)}
              >
                {project.selected.includes(detail.id) ? (
                  <Check size={14} />
                ) : (
                  <Bookmark size={14} />
                )}{" "}
                {project.selected.includes(detail.id)
                  ? "Dans ma sélection"
                  : "Conserver"}
              </button>
              {sourceLink(detail.url) && (
                <a
                  className="secondary"
                  target="_blank"
                  rel="noreferrer"
                  href={sourceLink(detail.url)}
                >
                  Notice d’origine <ExternalLink size={13} />
                </a>
              )}
              {detail.imageUrl && sourceLink(detail.imageUrl) && (
                <a
                  className="secondary"
                  href={sourceLink(detail.imageUrl)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Image HD <ArrowDownToLine size={13} />
                </a>
              )}
            </div>
          </section>
        </div>
      )}
      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="icon-button modal-close"
              aria-label="Fermer"
              onClick={() => setModal(null)}
            >
              <X size={19} />
            </button>
            <div className="eyebrow">PUPUCE INTELLIGENCE</div>
            <h2 id="modal-title">
              {modal === "project"
                ? "Une nouvelle recherche."
                : modal === "import"
                  ? "Un cours à explorer."
                  : "Votre atelier, à votre façon."}
            </h2>
            {modal === "project" ? (
              <form onSubmit={addProject}>
                <label htmlFor="project-name">Sujet ou titre du dossier</label>
                <input
                  id="project-name"
                  autoFocus
                  required
                  maxLength={100}
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Ex. Le corps héroïque, de Raphaël à David"
                />
                <p className="muted">
                  Un espace pour vos sources, vos notes et votre conversation.
                </p>
                <button className="primary">
                  Créer le dossier <ArrowRight size={14} />
                </button>
              </form>
            ) : modal === "import" ? (
              <form onSubmit={importCourse}>
                <label htmlFor="course-title">Titre du document</label>
                <input
                  id="course-title"
                  autoFocus
                  required
                  maxLength={160}
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                  placeholder="Cours · L’art néoclassique"
                />
                <label htmlFor="course-text">Texte du cours</label>
                <textarea
                  id="course-text"
                  required
                  maxLength={100000}
                  rows={10}
                  value={courseText}
                  onChange={(e) => setCourseText(e.target.value)}
                  placeholder="Collez le texte du cours avec ses titres et numéros de pages si disponibles…"
                />
                <p className="micro">
                  Import texte uniquement pour cette première version. Le cours
                  sera conservé sur cet appareil. L’assistant reçoit jusqu’à 6
                  000 caractères par cours sélectionné, dans une limite globale
                  de contexte.
                </p>
                <button className="primary">
                  Ajouter au dossier <Plus size={14} />
                </button>
              </form>
            ) : (
              <div className="settings-content">
                <div className="setting-row">
                  <div>
                    <strong>Une autre lumière</strong>
                    <p>Changer l’apparence de l’atelier.</p>
                  </div>
                  <button
                    className="secondary"
                    onClick={() =>
                      setWorkspace((w) =>
                        w
                          ? {
                              ...w,
                              theme: w.theme === "light" ? "dark" : "light",
                            }
                          : w,
                      )
                    }
                  >
                    {workspace.theme === "light" ? (
                      <Moon size={15} />
                    ) : (
                      <Sun size={15} />
                    )}{" "}
                    {workspace.theme === "light" ? "Sombre" : "Clair"}
                  </button>
                </div>
                <label htmlFor="access-code">Code d’accès à l’assistant</label>
                <input
                  id="access-code"
                  type="password"
                  value={accessKey}
                  onChange={(e) => setAccessKey(e.target.value)}
                  placeholder="Code fourni par l’administrateur"
                  autoComplete="off"
                />
                <p className="micro">
                  Conservé uniquement en mémoire dans cet onglet. Les clés du
                  modèle et d’Hermes restent sur le serveur.
                </p>
                <div className="setting-note">
                  <strong>Vos recherches vous appartiennent.</strong>
                  <p>
                    Cette première version enregistre les dossiers dans ce
                    navigateur. Exportez une sauvegarde pour les conserver
                    ailleurs. La synchronisation entre appareils et les outils
                    MCP spécialisés restent à ajouter.
                  </p>
                </div>
                <div className="setting-actions">
                  <button
                    className="secondary"
                    onClick={() =>
                      download(
                        "pupuce-sauvegarde.json",
                        JSON.stringify(workspace, null, 2),
                        "application/json",
                      )
                    }
                  >
                    <ArrowDownToLine size={14} />
                    Sauvegarder tout
                  </button>
                  <button
                    className="secondary"
                    onClick={() => uploadRef.current?.click()}
                  >
                    <Upload size={14} />
                    Restaurer un fichier
                  </button>
                </div>
                <p className="micro">
                  La restauration remplace l’atelier de ce navigateur.
                  Sauvegardez votre travail actuel au préalable.
                </p>
              </div>
            )}
          </section>
        </div>
      )}
      <input
        type="file"
        ref={uploadRef}
        hidden
        accept="application/json,.json"
        onChange={(e) => restore(e.target.files?.[0])}
      />
      {notice && (
        <div className="toast" role="status">
          <Check size={15} />
          {notice}
        </div>
      )}
    </div>
  );
}
