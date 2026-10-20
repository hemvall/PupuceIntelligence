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
  await assert.rejects(importSource('large.txt', Buffer.alloc(8 * 1024 * 1024 + 1)), /volumineux/);
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
