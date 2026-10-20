'use client';
import { useState } from 'react';
type Run = { runId: string; prompt?: string; output?: string; status?: string; model?: string; updatedAt: string; usage?: { input_tokens?: number; output_tokens?: number; prompt_tokens?: number; completion_tokens?: number } };
export function Monitoring({ accessKey }: { accessKey: string }) {
  const [runs, setRuns] = useState<Run[]>([]), [error, setError] = useState('');
  async function refresh() {
    try {
      const r = await fetch('/api/monitoring', { headers: { 'x-app-access-key': accessKey } });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setRuns(data.runs); setError('');
    } catch { setError('Suivi indisponible.'); }
  }
  const inputTotal = runs.reduce((n, r) => n + (r.usage?.input_tokens ?? r.usage?.prompt_tokens ?? 0), 0);
  const outputTotal = runs.reduce((n, r) => n + (r.usage?.output_tokens ?? r.usage?.completion_tokens ?? 0), 0);
  const tokens = (r: Run) => r.usage ? `${r.usage.input_tokens ?? r.usage.prompt_tokens ?? '?'} entrée · ${r.usage.output_tokens ?? r.usage.completion_tokens ?? '?'} sortie` : 'Tokens non fournis par le service';
  return <details className="monitoring" onToggle={e => { if (e.currentTarget.open) void refresh(); }}>
    <summary>Historique et consommation IA</summary>
    <button className="text-button" onClick={refresh}>Actualiser</button>
    <p>Prompts et réponses enregistrés sur ce Mac. Les tokens affichés sont ceux déclarés par le service.</p>
    <p>{runs.length} appels · {inputTotal.toLocaleString("fr-FR")} tokens entrée · {outputTotal.toLocaleString("fr-FR")} tokens sortie (métriques disponibles uniquement)</p>
    {error && <p role="alert">{error}</p>}
    {!runs.length && <p>Aucun appel enregistré.</p>}
    {runs.map(r => <details key={r.runId}><summary>{new Date(r.updatedAt).toLocaleString('fr-FR')} · {r.status}</summary><p>{r.model || 'Modèle non communiqué'} · {tokens(r)}</p><h4>Prompt</h4><pre>{r.prompt}</pre><h4>Réponse</h4><pre>{r.output || 'Pas de réponse enregistrée'}</pre></details>)}
  </details>;
}
