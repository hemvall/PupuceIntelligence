import { NextRequest, NextResponse } from 'next/server';
import { checkAccess } from '@/lib/hermes.mjs';
import { importSource } from '@/lib/source-import';
import { MAX_FILE_BYTES } from '@/lib/import-schema';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(request: NextRequest) {
  const denied = checkAccess(request);
  if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status });
  if (Number(request.headers.get('content-length')) > MAX_FILE_BYTES + 100_000) return NextResponse.json({ error: '8 Mo maximum par fichier.' }, { status: 413 });
  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File) || file.size > MAX_FILE_BYTES || !file.size) return NextResponse.json({ error: 'Choisis un fichier de 8 Mo maximum.' }, { status: 400 });
    const source = await importSource(file.name, Buffer.from(await file.arrayBuffer()));
    return NextResponse.json({ source }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Import impossible.' }, { status: 400 });
  }
}
