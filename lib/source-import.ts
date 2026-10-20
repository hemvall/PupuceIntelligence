import { extractPptx } from './pptx-import';
import { extractRawText } from 'mammoth';
import { fromBuffer } from 'yauzl';
import { imageSize } from 'image-size';
import type { Source } from './types';
import { MAX_FILE_BYTES, type Attachment } from './import-schema';
const MAX_TEXT = 200_000;
const MAX_PAGES = 100;
async function validateDocx(buffer: Buffer) {
  await new Promise<void>((resolve, reject) => {
    fromBuffer(buffer, { lazyEntries: true }, (error, zip) => {
      if (error || !zip) { reject(new Error('Ce fichier Word est illisible.')); return; }
      let total = 0, entries = 0, hasDocument = false;
      zip.on('error', reject);
      zip.on('entry', entry => {
        total += entry.uncompressedSize; entries++;
        if (total > 400_000_000 || entries > 3000 || entry.generalPurposeBitFlag & 1) {
          zip.close(); reject(new Error('Le document Word est protégé ou trop volumineux une fois décompressé.')); return;
        }
        if (entry.fileName === 'word/document.xml') hasDocument = true;
        zip.readEntry();
      });
      zip.on('end', () => hasDocument ? resolve() : reject(new Error('Ce fichier n’est pas un document Word .docx.')));
      zip.readEntry();
    });
  });
}
export async function importSource(name: string, buffer: Buffer): Promise<Source> {
  if (!buffer.length || buffer.length > MAX_FILE_BYTES) throw new Error('Fichier vide ou trop volumineux : 100 Mo maximum.');
  name = name.replace(/[\\/\u0000-\u001f]/g, '_').slice(0, 250);
  const ext = name.split('.').pop()?.toLowerCase();
  let mime: Attachment['mime'], extraction: Attachment['extraction'] = 'text', text = '', warning: string | undefined;
  if (ext === 'pdf') {
    if (!buffer.subarray(0, 1024).includes(Buffer.from('%PDF-'))) throw new Error('Le contenu ne correspond pas à un PDF.');
    mime = 'application/pdf';
    const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const task = getDocument({ data: new Uint8Array(buffer), useSystemFonts: true, useWorkerFetch: false });
    try {
      const pdf = await task.promise;
      const parts: string[] = [];
      let length = 0;
      for (let i = 1; i <= Math.min(pdf.numPages, MAX_PAGES); i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map(item => 'str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : '').join('').trim();
        if (pageText) { const part = `[Page ${i}]\n${pageText}`; parts.push(part); length += part.length; }
        page.cleanup();
        if (length >= MAX_TEXT) break;
      }
      text = parts.join('\n\n');
      if (pdf.numPages > MAX_PAGES || length >= MAX_TEXT) { extraction = 'partial'; warning = 'Extraction limitée à 100 pages et 200 000 caractères. Consulte l’original pour la suite.'; }
      if (!text.trim()) { extraction = 'empty'; warning = 'Aucun texte détecté : ce PDF est peut-être scanné. Il est conservé, mais son contenu n’est pas lisible par l’assistant sans transcription.'; }
    } catch (error) {
      if (error instanceof Error && error.name === 'PasswordException') { extraction = 'empty'; warning = 'PDF protégé : original conservé, texte inaccessible. Importe une copie déverrouillée pour l’assistant.'; }
      else throw new Error('Impossible de lire ce PDF. Vérifie qu’il s’ouvre correctement sur ton appareil.');
    } finally { await task.destroy(); }
  } else if (ext === 'pptx') {
    mime = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    const result = await extractPptx(buffer);
    text = result.text;
    extraction = result.partial ? 'partial' : text ? 'text' : 'empty';
    warning = result.partial ? 'Extraction limitée à 100 diapositives et 200 000 caractères. L’original complet est conservé.' : 'Texte des diapositives extrait. Les images, graphiques et animations ne sont pas analysés automatiquement.';
    if (!text) warning = 'Aucun texte détecté dans les diapositives. L’original est conservé ; les images ne sont pas analysées automatiquement.';
  } else if (ext === 'ppt') {
    throw new Error('Pour un ancien PowerPoint .ppt, utilise Enregistrer sous → .pptx dans PowerPoint ou LibreOffice.');
  } else if (ext === 'docx') {
    mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    await validateDocx(buffer);
    try { text = (await extractRawText({ buffer })).value.trim(); }
    catch { throw new Error('Impossible de lire ce document Word. Enregistre-le à nouveau au format .docx.'); }
    if (!text) { extraction = 'empty'; warning = 'Aucun texte extrait. L’original est conservé ; les images du document ne sont pas analysées automatiquement.'; }
  } else if (['png', 'jpg', 'jpeg', 'webp'].includes(ext || '')) {
    const expected = ext === 'jpg' || ext === 'jpeg' ? 'jpg' : ext;
    let dimensions;
    try { dimensions = imageSize(buffer); } catch { throw new Error('Cette image est illisible.'); }
    if (dimensions.type !== expected || !dimensions.width || !dimensions.height || dimensions.width * dimensions.height > 40_000_000) throw new Error('Format d’image incohérent ou image trop grande (40 mégapixels maximum).');
    mime = expected === 'jpg' ? 'image/jpeg' : expected === 'png' ? 'image/png' : 'image/webp';
    extraction = 'image'; warning = 'Image conservée. Ajoute une description dans tes notes pour que l’assistant puisse l’exploiter ; aucune lecture visuelle automatique n’est effectuée.';
  } else if (ext === 'txt') {
    mime = 'text/plain';
    try { text = new TextDecoder('utf-8', { fatal: true }).decode(buffer).trim(); }
    catch { throw new Error('Enregistre ce fichier texte en UTF-8 avant de l’importer.'); }
    if (!text) throw new Error('Ce fichier texte est vide.');
  } else throw new Error('Format accepté : PDF, Word .docx, PowerPoint .pptx, JPG, PNG, WebP ou TXT. Pour un ancien fichier .doc, utilise Enregistrer sous → .docx dans Word.');
  if (text.length >= MAX_TEXT) { text = text.slice(0, MAX_TEXT); extraction = 'partial'; warning = 'Texte limité à 200 000 caractères. L’original complet est conservé.'; }
  return {
    id: 'file-' + crypto.randomUUID(), title: name, creator: 'Document personnel', date: new Date().getFullYear().toString(),
    kind: 'Cours', institution: 'Mes documents', url: '', description: text ? text.slice(0, 180) : warning!,
    access: text ? 'Texte importé' : 'Fichier importé', retrievedAt: new Date().toISOString(), ...(text ? { text } : {}),
    attachment: { name, mime, size: buffer.length, data: buffer.toString('base64'), extraction, ...(warning ? { warning } : {}) },
  };
}
