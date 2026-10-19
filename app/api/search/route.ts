import { NextRequest, NextResponse } from "next/server";
import type { Source } from "@/lib/types";
export const runtime = "nodejs";
export const maxDuration = 60;
async function json(url: string) {
  const r = await fetch(url, {
    signal: AbortSignal.timeout(12000),
    headers: {
      "User-Agent": "PupuceIntelligence/0.1 (academic research prototype)",
    },
    next: { revalidate: 3600 },
  });
  if (!r.ok) throw new Error("Catalogue indisponible");
  return r.json();
}
async function artworks(q: string): Promise<Source[]> {
  const hits = await json(
    `https://collectionapi.metmuseum.org/public/collection/v1/search?hasImages=true&q=${encodeURIComponent(q)}`,
  );
  const records = await Promise.allSettled(
    (hits.objectIDs || [])
      .slice(0, 8)
      .map((id: number) =>
        json(
          `https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`,
        ),
      ),
  );
  if (records.length && records.every((r) => r.status === "rejected"))
    throw new Error("Notices indisponibles");
  const sources: Source[] = [];
  for (const result of records) {
    if (result.status !== "fulfilled") continue;
    const d = result.value;
    if (!d.isPublicDomain || !d.primaryImage) continue;
    sources.push({
      id: `met-${d.objectID}`,
      title: d.title || "Sans titre",
      creator: d.artistDisplayName || d.culture || "Attribution non renseignée",
      date: d.objectDate || "Date non renseignée",
      kind: "Œuvre",
      institution: "The Metropolitan Museum of Art",
      url:
        d.objectURL ||
        `https://www.metmuseum.org/art/collection/search/${d.objectID}`,
      image: d.primaryImageSmall || d.primaryImage,
      imageUrl: d.primaryImage,
      rights: "CC0 · Met Open Access",
      inventory: d.accessionNumber,
      description: [d.medium, d.dimensions, d.creditLine]
        .filter(Boolean)
        .join(" · "),
      access: "Notice consultée",
      retrievedAt: new Date().toISOString(),
    });
  }
  return sources;
}
async function books(q: string): Promise<Source[]> {
  const d = await json(
    `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=8&fields=key,title,author_name,first_publish_year,cover_i`,
  );
  return (d.docs || []).map(
    (b: {
      key: string;
      title: string;
      author_name?: string[];
      first_publish_year?: number;
      cover_i?: number;
    }): Source => ({
      id: `ol-${b.key.split("/").pop()}`,
      title: b.title,
      creator: b.author_name?.join(", ") || "Auteur non renseigné",
      date: String(b.first_publish_year || ""),
      kind: "Ouvrage",
      institution: "Open Library",
      url: `https://openlibrary.org${b.key}`,
      image: b.cover_i
        ? `https://covers.openlibrary.org/b/id/${b.cover_i}-M.jpg`
        : undefined,
      description:
        "Piste bibliographique issue du catalogue Open Library. Consulter les éditions et vérifier la référence dans un catalogue de bibliothèque. Le texte du livre n’a pas été consulté.",
      access: "Notice consultée",
      retrievedAt: new Date().toISOString(),
    }),
  );
}
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length > 160)
    return NextResponse.json(
      { error: "Saisis une recherche de 1 à 160 caractères." },
      { status: 400 },
    );
  const results = await Promise.allSettled([artworks(q), books(q)]);
  const warnings = results.flatMap((r, i) =>
    r.status === "rejected"
      ? [
          `${i === 0 ? "Le catalogue du Met" : "Open Library"} est indisponible. Réessaie dans un instant.`,
        ]
      : [],
  );
  return NextResponse.json(
    {
      sources: results.flatMap((r) =>
        r.status === "fulfilled" ? r.value : [],
      ),
      warnings,
    },
    { status: warnings.length === 2 ? 502 : 200 },
  );
}
