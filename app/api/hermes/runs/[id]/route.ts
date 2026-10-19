import { NextRequest, NextResponse } from "next/server";
import { checkAccess, hermesConfig } from "@/lib/hermes.mjs";
export const runtime = "nodejs";
async function proxy(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
  stop = false,
) {
  const denied = checkAccess(request);
  if (denied)
    return NextResponse.json(
      { error: denied.error },
      { status: denied.status },
    );
  const config = hermesConfig();
  if (!config)
    return NextResponse.json(
      { error: "L’assistant n’est pas encore connecté." },
      { status: 503 },
    );
  const { id } = await context.params;
  if (!/^[a-zA-Z0-9_-]{1,160}$/.test(id))
    return NextResponse.json(
      { error: "Identifiant invalide." },
      { status: 400 },
    );
  try {
    const r = await fetch(
      `${config.url}/v1/runs/${encodeURIComponent(id)}${stop ? "/stop" : ""}`,
      {
        method: stop ? "POST" : "GET",
        headers: {
          Authorization: `Bearer ${config.key}`,
          "Content-Type": "application/json",
        },
        ...(stop ? { body: "{}" } : {}),
        signal: AbortSignal.timeout(15000),
        cache: "no-store",
      },
    );
    if (!r.ok)
      return NextResponse.json(
        {
          error:
            r.status === 404
              ? "Le suivi de cette recherche n’est plus disponible."
              : "Le suivi de la recherche est momentanément indisponible.",
        },
        { status: r.status === 404 ? 404 : 502 },
      );
    const data = await r.json();
    return NextResponse.json(
      { status: data.status, output: data.output, run_id: data.run_id },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      {
        error:
          "Connexion à l’assistant interrompue. Réessaie pour reprendre le suivi.",
      },
      { status: 502 },
    );
  }
}
export const GET = (
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) => proxy(request, context);
export const POST = (
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) => proxy(request, context, true);
