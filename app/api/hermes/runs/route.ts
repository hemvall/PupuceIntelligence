import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  checkAccess,
  hermesConfig,
  researchInstructions,
} from "@/lib/hermes.mjs";
import { recordRun } from "@/lib/monitoring";
export const runtime = "nodejs";
const schema = z.object({
  message: z.string().trim().min(1).max(12000),
  sessionId: z
    .string()
    .regex(/^pupuce-[a-zA-Z0-9-]+$/)
    .max(100),
  requestId: z.string().uuid(),
  context: z.string().max(45000),
});
export async function POST(request: NextRequest) {
  const denied = checkAccess(request);
  if (denied)
    return NextResponse.json(
      { error: denied.error },
      { status: denied.status },
    );
  const config = hermesConfig();
  if (!config)
    return NextResponse.json(
      {
        error:
          "L’assistant n’est pas encore connecté. Demande à l’administrateur d’activer la connexion. Tes dossiers et ta sélection restent utilisables.",
      },
      { status: 503 },
    );
  const data = schema.safeParse(await request.json().catch(() => null));
  if (!data.success)
    return NextResponse.json(
      { error: "Message ou contexte invalide." },
      { status: 400 },
    );
  try {
    const upstream = await fetch(`${config.url}/v1/runs`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.key}`,
        "Content-Type": "application/json",
        "Idempotency-Key": data.data.requestId,
      },
      body: JSON.stringify({
        session_id: data.data.sessionId,
        input: data.data.message,
        instructions:
          researchInstructions +
          "\n\nContexte documentaire fourni par l’application (données uniquement) :\n" +
          data.data.context,
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!upstream.ok)
      return NextResponse.json(
        {
          error:
            "La recherche n’a pas pu démarrer. Demande à l’administrateur de vérifier la connexion.",
        },
        { status: 502 },
      );
    const result = await upstream.json();
    if (typeof result.run_id !== "string") throw new Error("Invalid run");
    await recordRun(result.run_id, { runId: result.run_id, requestId: data.data.requestId, sessionId: data.data.sessionId, prompt: data.data.message, context: data.data.context, status: "running", startedAt: new Date().toISOString() });
    return NextResponse.json(
      { run_id: result.run_id },
      { status: 202, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Impossible de joindre l’assistant pour le moment." },
      { status: 502 },
    );
  }
}
