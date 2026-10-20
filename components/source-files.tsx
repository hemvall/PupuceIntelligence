'use client';
import { useRef, useState } from 'react';
import { FileText, Upload, X, LoaderCircle } from 'lucide-react';
import type { Source } from '@/lib/types';
import { MAX_FILE_BYTES } from '@/lib/import-schema';
export function SourceFiles({ sources, onChange, accessKey, onBusy }: { sources: Source[]; onChange: (sources: Source[]) => void; accessKey: string; onBusy: (busy: boolean) => void }) {
  const [busy, setBusy] = useState(false), [errors, setErrors] = useState<string[]>([]);
  const lock = useRef(false);
  async function importFiles(files: FileList | File[]) {
    if (lock.current) return;
    lock.current = true; setBusy(true); onBusy(true); setErrors([]);
    const added: Source[] = [], failures: string[] = [];
    try {
      if (files.length + sources.length > 12) { setErrors(['Ajoute jusqu’à 12 fichiers à la fois.']); return; }
      for (const file of Array.from(files)) {
        if (file.size > MAX_FILE_BYTES) { failures.push(`${file.name} : 8 Mo maximum par fichier.`); continue; }
        try {
          const form = new FormData(); form.append('file', file);
          const response = await fetch('/api/sources/import', { method: 'POST', headers: { 'x-app-access-key': accessKey }, body: form });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'Import impossible.');
          added.push(data.source);
        } catch (e) { failures.push(`${file.name} : ${e instanceof Error ? e.message : 'Import impossible.'}`); }
      }
      onChange([...sources, ...added]); setErrors(failures);
    } finally { lock.current = false; setBusy(false); onBusy(false); }
  }
  return <div className="source-files">
    <label className={`file-drop ${busy ? 'busy' : ''}`} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); void importFiles(e.dataTransfer.files); }}>
      {busy ? <LoaderCircle size={22} className="spin" /> : <Upload size={22} />}
      <strong>{busy ? 'Lecture des documents…' : 'Ajouter des fichiers'}</strong>
      <span>Glisse-les ici ou choisis-les sur ton appareil</span>
      <span>PDF, Word (.docx), JPG, PNG, WebP, TXT · 8 Mo par fichier</span>
      <input aria-label="Choisir des fichiers" type="file" multiple disabled={busy} accept=".pdf,.docx,.png,.jpg,.jpeg,.webp,.txt" onChange={e => { if (e.target.files) void importFiles(e.target.files); e.target.value = ''; }} />
    </label>
    {sources.map(s => <div className="import-file" key={s.id}><FileText size={18} /><div><strong>{s.title}</strong><p>{s.attachment?.extraction === 'text' ? 'Texte prêt pour l’assistant' : s.attachment?.warning}</p></div><button type="button" disabled={busy} className="icon-button" aria-label={`Retirer ${s.title}`} onClick={() => onChange(sources.filter(x => x.id !== s.id))}><X size={16} /></button></div>)}
    {errors.map(e => <p key={e} role="alert" className="alert">{e}</p>)}
  </div>;
}
export function OriginalFile({ source }: { source: Source }) {
  const a = source.attachment;
  if (!a) return null;
  const url = `data:${a.mime};base64,${a.data}`;
  return <section className="original-file">
    {a.mime.startsWith('image/') && <img src={url} alt={source.title} />}
    <p>{a.name} · {(a.size / 1024 / 1024).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} Mo</p>
    {a.warning && <p className="alert">{a.warning}</p>}
    <a className="secondary" href={url} download={a.name}>Télécharger l’original</a>
  </section>;
}
