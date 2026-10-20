import { NextRequest, NextResponse } from 'next/server';
import { localRequest, localCookie, equalSecret } from '@/lib/local-access.mjs';
import { readWorkspace, writeWorkspace, workspaceDirectory } from '@/lib/local-workspace.mjs';
import { MAX_WORKSPACE_CHARS } from '@/lib/import-schema';
import { workspaceSchema } from '@/lib/workspace';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
function authorized(request: NextRequest) {
  return localRequest(request, process.env) && equalSecret(localCookie(request, process.env), process.env.APP_ACCESS_KEY);
}
const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
export async function GET(request: NextRequest) {
  if (!authorized(request)) return json({ error: 'Ouvre Pupuce avec le raccourci du Bureau pour accéder aux dossiers du Mac.' }, 403);
  try {
    const saved = await readWorkspace();
    if (saved.value !== null) workspaceSchema.parse(JSON.parse(saved.value));
    return json({ ...saved, directory: workspaceDirectory() });
  } catch { return json({ error: 'Impossible de lire atelier.json sur le Mac. Le fichier est conservé sans modification.' }, 500); }
}
export async function PUT(request: NextRequest) {
  if (!authorized(request)) return json({ error: 'Session locale expirée. Rouvre Pupuce avec le raccourci du Bureau.' }, 403);
  try {
    const body = await request.json();
    if (typeof body.value !== 'string' || body.value.length > MAX_WORKSPACE_CHARS || !(body.revision === null || typeof body.revision === 'string')) return json({ error: 'Sauvegarde invalide ou trop volumineuse (300 Mo maximum).' }, 400);
    const parsed = workspaceSchema.safeParse(JSON.parse(body.value));
    if (!parsed.success) return json({ error: 'Sauvegarde invalide.' }, 400);
    return json(await writeWorkspace(body.value, body.revision));
  } catch (error) {
    if (error instanceof SyntaxError) return json({ error: 'Sauvegarde JSON invalide.' }, 400);
    if (error instanceof Error && 'status' in error && error.status === 409) return json({ error: error.message }, 409);
    return json({ error: 'Enregistrement sur le Mac impossible. Vérifie l’espace libre et les droits du dossier Documents/PupuceIntelligence.' }, 500);
  }
}
