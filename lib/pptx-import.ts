import { fromBuffer } from 'yauzl';
import { DOMParser } from '@xmldom/xmldom';

const DRAWING = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
function xml(value: string) {
  if (/<!DOCTYPE|<!ENTITY/i.test(value)) throw new Error('XML PowerPoint non pris en charge.');
  return new DOMParser({ errorHandler: { warning() {}, error() { throw new Error('XML PowerPoint invalide.'); }, fatalError() { throw new Error('XML PowerPoint invalide.'); } } }).parseFromString(value, 'application/xml');
}

export async function extractPptx(buffer: Buffer): Promise<{ text: string; partial: boolean }> {
  const files = await new Promise<Map<string, string>>((resolve, reject) => {
    fromBuffer(buffer, { lazyEntries: true }, (error, zip) => {
      if (error || !zip) return reject(new Error('Ce fichier PowerPoint est illisible.'));
      const files = new Map<string, string>();
      let total = 0, count = 0, xmlBytes = 0;
      const fail = (error: Error) => { zip.close(); reject(error); };
      zip.on('error', fail);
      zip.on('end', () => resolve(files));
      zip.on('entry', entry => {
        total += entry.uncompressedSize;
        if (++count > 10000 || total > 400_000_000 || entry.generalPurposeBitFlag & 1) return fail(new Error('PowerPoint protégé ou trop volumineux après décompression.'));
        if (!/^(ppt\/presentation.xml|ppt\/_rels\/presentation.xml.rels|ppt\/slides\/slide\d+.xml)$/.test(entry.fileName)) return zip.readEntry();
        xmlBytes += entry.uncompressedSize;
        if (xmlBytes > 20_000_000 || files.has(entry.fileName)) return fail(new Error('Structure PowerPoint trop volumineuse ou ambiguë.'));
        zip.openReadStream(entry, (error, stream) => {
          if (error || !stream) return fail(new Error('Impossible de lire les diapositives.'));
          const chunks: Buffer[] = [];
          stream.on('error', fail);
          stream.on('data', chunk => chunks.push(chunk));
          stream.on('end', () => { files.set(entry.fileName, Buffer.concat(chunks).toString('utf8')); zip.readEntry(); });
        });
      });
      zip.readEntry();
    });
  });
  if (!files.has('ppt/presentation.xml') || !files.has('ppt/_rels/presentation.xml.rels')) throw new Error('Ce fichier n’est pas une présentation PowerPoint .pptx.');
  const relationships = new Map<string, string>();
  const rels = xml(files.get('ppt/_rels/presentation.xml.rels')!).getElementsByTagName('Relationship');
  for (let i = 0; i < rels.length; i++) {
    const rel = rels.item(i)!;
    if (rel.getAttribute('TargetMode') === 'External') continue;
    const target = rel.getAttribute('Target') || '';
    const path = target.startsWith('/') ? target.slice(1) : 'ppt/' + target.replace(/^\.\//, '');
    if (/^ppt\/slides\/slide\d+\.xml$/.test(path)) relationships.set(rel.getAttribute('Id')!, path);
  }
  const slides = xml(files.get('ppt/presentation.xml')!).getElementsByTagNameNS('http://schemas.openxmlformats.org/presentationml/2006/main', 'sldId');
  const parts: string[] = [];
  let length = 0, partial = slides.length > 100;
  for (let i = 0; i < Math.min(slides.length, 100); i++) {
    const path = relationships.get(slides.item(i)!.getAttributeNS(REL, 'id')!);
    if (!path || !files.has(path)) throw new Error('Diapositive PowerPoint manquante ou illisible.');
    const paragraphs = xml(files.get(path)!).getElementsByTagNameNS(DRAWING, 'p');
    const lines: string[] = [];
    for (let j = 0; j < paragraphs.length; j++) {
      const runs = paragraphs.item(j)!.getElementsByTagNameNS(DRAWING, 't');
      let line = '';
      for (let k = 0; k < runs.length; k++) line += runs.item(k)!.textContent || '';
      if (line.trim()) lines.push(line.trim());
    }
    if (lines.length) {
      const part = `[Diapositive ${i + 1}]\n${lines.join('\n')}`;
      parts.push(part); length += part.length + 2;
    }
    if (length >= 200_000) { partial = true; break; }
  }
  return { text: parts.join('\n\n').slice(0, 200_000), partial };
}
