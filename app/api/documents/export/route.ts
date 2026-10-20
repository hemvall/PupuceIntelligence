import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { documentSchema } from "@/lib/document/model";
import { exportDocx, exportPdf } from "@/lib/document/export";
export const runtime = "nodejs";
export const maxDuration = 60;
const schema = z.object({
  format: z.enum(["docx", "pdf"]),
  document: documentSchema,
});
export async function POST(request: NextRequest) {
  if (Number(request.headers.get("content-length") || 0) > 4200000)
    return NextResponse.json(
      { error: "Le dossier dépasse 4 Mo. Réduis le nombre d’images." },
      { status: 413 },
    );
  const text = await request.text();
  if (text.length > 4200000)
    return NextResponse.json(
      { error: "Le dossier dépasse 4 Mo. Réduis le nombre d’images." },
      { status: 413 },
    );
  let data;
  try {
    data = schema.parse(JSON.parse(text));
  } catch {
    return NextResponse.json(
      {
        error:
          "Le document contient un contenu ou une image non pris en charge.",
      },
      { status: 400 },
    );
  }
  try {
    const buffer =
      data.format === "docx"
        ? await exportDocx(data.document)
        : await exportPdf(data.document);
    const name =
      data.document.title
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9_-]+/g, "-")
        .slice(0, 90) || "dossier";
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          data.format === "docx"
            ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            : "application/pdf",
        "Content-Disposition": `attachment; filename="${name}.${data.format}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "L’export a échoué. Vérifie les images et réessaie ; ton document est conservé.",
      },
      { status: 422 },
    );
  }
}
