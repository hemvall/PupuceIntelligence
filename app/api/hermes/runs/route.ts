import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  checkAccess,
  hermesConfig,
  researchInstructions,
} from "@/lib/hermes.mjs";
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
          "Hermes n’est pas encore connecté. Configure HERMES_URL et HERMES_API_KEY côté serveur. Tes dossiers et ta sélection restent utilisables.",
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
            "Hermes a refusé le lancement. Vérifie la connexion et sa configuration.",
        },
        { status: 502 },
      );
    const result = await upstream.json();
    if (typeof result.run_id !== "string") throw new Error("Invalid run");
    return NextResponse.json(
      { run_id: result.run_id },
      { status: 202, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Impossible de joindre Hermes pour le moment." },
      { status: 502 },
    );
  }
}
