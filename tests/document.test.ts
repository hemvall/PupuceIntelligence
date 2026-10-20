import test from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import { NextRequest } from "next/server";
import {
  blankDocument,
  documentSchema,
  generatedDocument,
  generationRequest,
  textOf,
} from "../lib/document/model";
import { exportDocx, exportPdf } from "../lib/document/export";
import { workspaceSchema } from "../lib/workspace";
import { initialWorkspace } from "../lib/seed";
import { dossierSources } from "../lib/dossier";
import { specimen } from "./fixtures/document";
import { POST } from "../app/api/documents/export/route";
test("full generated dossier uses only the selected source snapshot and survives workspace backup", () => {
  const request = generationRequest(
    "Cabanel",
    ["Introduction", "Analyse"],
    "Niveau licence",
    "Mes notes",
    dossierSources,
  );
  const raw = JSON.stringify({
    title: "Cabanel",
    sections: [
      {
        title: "Introduction",
        paragraphs: ["Une introduction développée."],
        sourceIds: ["cabanel-fabre"],
      },
      {
        title: "Analyse",
        paragraphs: ["Une lecture à vérifier."],
        sourceIds: [],
      },
    ],
  });
  const doc = generatedDocument("```json\n" + raw + "\n```", request.snapshot);
  assert.match(textOf(doc.content), /Bibliographie et documents consultés/);
  assert.match(textOf(doc.content), /\[1\]/);
  assert.throws(
    () =>
      generatedDocument(
        raw.replace("cabanel-fabre", "invented-reference"),
        request.snapshot,
      ),
    /absente du corpus/,
  );
  assert.throws(
    () => generatedDocument("Voici du Markdown sans JSON", request.snapshot),
    /structuré/,
  );
  const workspace = initialWorkspace();
  workspace.projects[0].document = doc;
  workspace.projects[0].documentProposal = doc;
  assert.equal(
    workspaceSchema.parse(JSON.parse(JSON.stringify(workspace))).projects[0]
      .document?.title,
    "Cabanel",
  );
});
test("export schema refuses external image fetches, executable links and excessive content", () => {
  const doc = blankDocument("Test");
  assert.equal(
    documentSchema.safeParse({
      ...doc,
      content: {
        type: "doc",
        content: [
          { type: "image", attrs: { src: "http://127.0.0.1/private" } },
        ],
      },
    }).success,
    false,
  );
  assert.equal(
    documentSchema.safeParse({
      ...doc,
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "unsafe",
                marks: [
                  { type: "link", attrs: { href: "javascript:alert(1)" } },
                ],
              },
            ],
          },
        ],
      },
    }).success,
    false,
  );
  assert.equal(
    documentSchema.safeParse({
      ...doc,
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "x".repeat(50001) }],
          },
        ],
      },
    }).success,
    false,
  );
});
test("Word preserves paragraphs, actual images, formatting and editable heading styles; PDF embeds pages", async () => {
  const doc = documentSchema.parse(specimen());
  const word = await exportDocx(doc),
    zip = await JSZip.loadAsync(word),
    xml = await zip.file("word/document.xml")!.async("string");
  assert.match(xml, /L’Ange déchu/);
  assert.match(xml, /Heading1/);
  assert.match(xml, /<w:b\/>/);
  assert.match(xml, /<w:i\/>/);
  assert.match(xml, /a:blip/);
  assert.ok(
    Object.keys(zip.files).some(
      (p) => p.startsWith("word/media/") && p.endsWith(".jpg"),
    ),
  );
  const pdf = await exportPdf(doc);
  assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
  assert.ok(pdf.length > 200000);
  assert.match(pdf.toString("latin1"), /\/Subtype \/Image/);
  assert.equal(
    (pdf.toString("latin1").match(/\/Type \/Page\b/g) || []).length,
    4,
    "page numbers must not create blank pages",
  );
});
test("export endpoint downloads both formats and rejects malformed images without losing the dossier", async () => {
  for (const format of ["docx", "pdf"]) {
    const r = await POST(
      new NextRequest("http://localhost/api/documents/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format,
          document: blankDocument("Dossier de test"),
        }),
      }),
    );
    assert.equal(r.status, 200);
    assert.match(
      r.headers.get("content-disposition")!,
      new RegExp("\\." + format),
    );
    assert.ok((await r.arrayBuffer()).byteLength > 500);
  }
  const doc = blankDocument("Image cassée");
  doc.content.content = [
    { type: "image", attrs: { src: "data:image/png;base64,aGVsbG8=" } },
  ];
  const r = await POST(
    new NextRequest("http://localhost/api/documents/export", {
      method: "POST",
      body: JSON.stringify({ format: "pdf", document: doc }),
    }),
  );
  assert.equal(r.status, 422);
});
