import test from 'node:test';
import assert from 'node:assert/strict';
import PDFDocument from 'pdfkit';
import { Document, Packer, Paragraph } from 'docx';
import { NextRequest } from 'next/server';
import { importSource } from '../lib/source-import';
import { POST } from '../app/api/sources/import/route';
import { initialWorkspace } from '../lib/seed';
import { workspaceSchema } from '../lib/workspace';
import { generationRequest } from '../lib/document/model';
async function pdf(text = true) {
  const doc = new PDFDocument();
  const chunks: Buffer[] = [];
  const done = new Promise<Buffer>((resolve, reject) => { doc.on('data', x => chunks.push(x)); doc.on('end', () => resolve(Buffer.concat(chunks))); doc.on('error', reject); });
  if (text) doc.font('Helvetica').text('Raphael et la Renaissance');
  doc.end(); return done;
}
test('PDF text retains page labels and exact original through workspace restore', async () => {
  const buffer = await pdf();
  const source = await importSource('Raphael.pdf', buffer);
  assert.match(source.text!, /\[Page 1\]/);
  assert.match(source.text!, /Renaissance/);
  assert.equal(source.attachment?.extraction, 'text');
  const workspace = initialWorkspace(); workspace.sources.push(source);
  const restored = workspaceSchema.parse(JSON.parse(JSON.stringify(workspace)));
  assert.deepEqual(Buffer.from(restored.sources.at(-1)!.attachment!.data, 'base64'), buffer);
  const request = generationRequest('Raphael', ['Introduction'], '', '', [source]);
  assert.match(request.context, /Renaissance/);
  assert.doesNotMatch(request.context, /JVBER/);
});
test('DOCX extraction keeps paragraphs without injecting markup into source text', async () => {
  const buffer = await Packer.toBuffer(new Document({ sections: [{ children: [new Paragraph('Cabanel et le corps'), new Paragraph('Analyse du tableau')] }] }));
  const source = await importSource('Cours.docx', buffer);
  assert.match(source.text!, /Cabanel et le corps\n\nAnalyse du tableau/);
  assert.equal(source.attachment?.mime, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
});
test('images and textless PDFs remain accessible with explicit reading limitations', async () => {
  const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5ioAAAAASUVORK5CYII=', 'base64');
  const source = await importSource('Image.png', image);
  assert.equal(source.access, 'Fichier importé'); assert.equal(source.text, undefined);
  assert.equal(source.attachment?.extraction, 'image');
  const scan = await importSource('Scan.pdf', await pdf(false));
  assert.equal(scan.attachment?.extraction, 'empty'); assert.match(scan.attachment!.warning!, /scanné/);
});
test('rejects unsupported, disguised, corrupted and oversized imports', async () => {
  await assert.rejects(importSource('old.doc', Buffer.from('abc')), /docx/);
  await assert.rejects(importSource('fake.pdf', Buffer.from('abc')), /correspond/);
  await assert.rejects(importSource('fake.png', Buffer.from('abc')), /illisible/);
  await assert.rejects(importSource('fake.docx', Buffer.from('abc')), /illisible/);
  await assert.rejects(importSource('large.txt', Buffer.alloc(100 * 1024 * 1024 + 1)), /volumineux/);
  await assert.rejects(importSource('bad.txt', Buffer.from([0xff,0xff])), /UTF-8/);
});
test('import endpoint checks authorization and parses a real multipart file', async () => {
  const old = process.env.APP_ACCESS_KEY; process.env.APP_ACCESS_KEY = 'import-test';
  try {
    const form = new FormData(); form.append('file', new File(['Mon cours sur David'], 'Cours.txt'));
    const unauthorized = await POST(new NextRequest('http://localhost/api/sources/import', { method:'POST', body: form }));
    assert.equal(unauthorized.status, 401);
    const response = await POST(new NextRequest('http://localhost/api/sources/import', { method:'POST', headers:{'x-app-access-key':'import-test'}, body: form }));
    assert.equal(response.status, 200); assert.equal((await response.json()).source.text, 'Mon cours sur David');
  } finally { if (old === undefined) delete process.env.APP_ACCESS_KEY; else process.env.APP_ACCESS_KEY = old; }
});

test('PPTX extracts paragraphs in presentation order, preserves original and feeds AI context', async () => {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  zip.file('ppt/presentation.xml', '<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:sldIdLst><p:sldId id="1" r:id="r2"/><p:sldId id="2" r:id="r1"/></p:sldIdLst></p:presentation>');
  zip.file('ppt/_rels/presentation.xml.rels', '<Relationships><Relationship Id="r1" Target="slides/slide1.xml"/><Relationship Id="r2" Target="slides/slide2.xml"/></Relationships>');
  const slide = (text: string) => `<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:p><a:r><a:t>${text}</a:t></a:r></a:p></p:sld>`;
  zip.file('ppt/slides/slide1.xml', slide('Cabanel &amp; Raphaël'));
  zip.file('ppt/slides/slide2.xml', slide('Renaissance'));
  const buffer = await zip.generateAsync({ type: 'nodebuffer' });
  const source = await importSource('Cours.PPTX', buffer);
  assert.match(source.text!, /^\[Diapositive 1\]\nRenaissance\n\n\[Diapositive 2\]\nCabanel & Raphaël$/);
  assert.equal(source.attachment?.extraction, 'text');
  const workspace = initialWorkspace(); workspace.sources.push(source);
  const restored = workspaceSchema.parse(JSON.parse(JSON.stringify(workspace)));
  assert.deepEqual(Buffer.from(restored.sources.at(-1)!.attachment!.data, 'base64'), buffer);
  assert.match(generationRequest('Art', ['Introduction'], '', '', [source]).context, /Renaissance/);
  await assert.rejects(importSource('bad.pptx', Buffer.from('abc')), /illisible/);
  await assert.rejects(importSource('old.ppt', buffer), /Enregistrer sous/);
  zip.file('ppt/slides/slide2.xml', '<!DOCTYPE x [<!ENTITY x "test">]><x/>');
  await assert.rejects(importSource('entity.pptx', await zip.generateAsync({ type: 'nodebuffer' })), /XML/);
});

test('files over the former 8 MiB limit import through multipart and survive workspace validation', async () => {
  const buffer = Buffer.alloc(9 * 1024 * 1024, 'a');
  const old = process.env.APP_ACCESS_KEY; process.env.APP_ACCESS_KEY = 'large-test';
  try {
    const form = new FormData(); form.append('file', new File([buffer], 'Grand-cours.txt'));
    const response = await POST(new NextRequest('http://localhost/api/sources/import', { method: 'POST', headers: { 'x-app-access-key': 'large-test' }, body: form }));
    assert.equal(response.status, 200);
    const { source } = await response.json();
    assert.equal(source.attachment.size, buffer.length);
    assert.equal(source.attachment.extraction, 'partial');
    const workspace = initialWorkspace(); workspace.sources.push(source);
    assert.equal(workspaceSchema.parse(workspace).sources.at(-1)!.attachment!.size, buffer.length);
  } finally { if (old === undefined) delete process.env.APP_ACCESS_KEY; else process.env.APP_ACCESS_KEY = old; }
});
