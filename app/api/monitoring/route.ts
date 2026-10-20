import { NextRequest, NextResponse } from 'next/server';
import { checkAccess } from '@/lib/hermes.mjs';
import { readRuns } from '@/lib/monitoring';
export const runtime = 'nodejs';
export async function GET(request: NextRequest) {
  const denied = checkAccess(request);
  if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status });
  try { return NextResponse.json({ runs: await readRuns() }, { headers: { 'Cache-Control': 'no-store' } }); }
  catch { return NextResponse.json({ error: 'Impossible de lire le suivi local.' }, { status: 500 }); }
}
