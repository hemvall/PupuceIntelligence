import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  HeadingLevel,
  Footer,
  PageNumber,
  AlignmentType,
  ExternalHyperlink,
} from "docx";
import PDFDocument from "pdfkit";
import { imageSize } from "image-size";
import { join } from "node:path";
import type { ResearchDocument, RichNode } from "./model";
import { textOf } from "./model";
function image(node: RichNode) {
  const match = node.attrs?.src?.match(/^data:image\/(png|jpeg);base64,(.+)$/);
  if (!match)
    throw new Error("Image non incorporée. Réimporte-la avant d’exporter.");
  const buffer = Buffer.from(match[2], "base64");
  const { width, height } = imageSize(buffer);
  if (!width || !height || width * height > 25000000)
    throw new Error("Dimensions d’image invalides.");
  const png = buffer
    .subarray(0, 8)
    .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg = buffer[0] === 255 && buffer[1] === 216;
  if ((match[1] === "png" && !png) || (match[1] === "jpeg" && !jpeg))
    throw new Error("Format d’image invalide.");
  return {
    buffer,
    width,
    height,
    type: match[1] === "png" ? ("png" as const) : ("jpg" as const),
  };
}
function wordRuns(n: RichNode): (TextRun | ExternalHyperlink)[] {
  if (n.type === "hardBreak") return [new TextRun({ break: 1 })];
  if (n.type !== "text") return (n.content || []).flatMap(wordRuns);
  const run = new TextRun({
    text: n.text || "",
    bold: n.marks?.some((m) => m.type === "bold"),
    italics: n.marks?.some((m) => m.type === "italic"),
    strike: n.marks?.some((m) => m.type === "strike"),
    underline: n.marks?.some((m) => m.type === "underline") ? {} : undefined,
  });
  const href = n.marks?.find((m) => m.type === "link")?.attrs?.href;
  return href
    ? [new ExternalHyperlink({ link: href, children: [run] })]
    : [run];
}
export async function exportDocx(doc: ResearchDocument): Promise<Buffer> {
  const children: Paragraph[] = [
    new Paragraph({
      text: doc.title,
      heading: HeadingLevel.TITLE,
      spacing: { after: 360 },
    }),
  ];
  function block(
    n: RichNode,
    depth = 0,
    list?: "bullet" | "number",
    index = 1,
  ) {
    if (n.type === "image") {
      const img = image(n),
        scale = Math.min(560 / img.width, 500 / img.height, 1);
      children.push(
        new Paragraph({
          children: [
            new ImageRun({
              data: img.buffer,
              type: img.type,
              transformation: {
                width: img.width * scale,
                height: img.height * scale,
              },
              altText: {
                title: n.attrs?.alt || "Illustration",
                description: n.attrs?.alt || "",
                name: "Illustration",
              },
            }),
          ],
          alignment: AlignmentType.CENTER,
          keepNext: true,
          spacing: { before: 180, after: 120 },
        }),
      );
      return;
    }
    if (n.type === "bulletList" || n.type === "orderedList") {
      (n.content || []).forEach((c, i) =>
        block(
          c,
          depth,
          n.type === "bulletList" ? "bullet" : "number",
          (n.attrs?.start || 1) + i,
        ),
      );
      return;
    }
    if (n.type === "listItem") {
      (n.content || []).forEach((c, i) =>
        block(c, depth + 1, i === 0 ? list : undefined, index),
      );
      return;
    }
    if (n.type === "blockquote") {
      (n.content || []).forEach((c) => block(c, depth + 1));
      return;
    }
    if (n.type === "horizontalRule") {
      children.push(new Paragraph({ text: "", spacing: { after: 180 } }));
      return;
    }
    if (n.type === "heading" || n.type === "paragraph") {
      children.push(
        new Paragraph({
          children: [
            ...(list
              ? [new TextRun(list === "bullet" ? "• " : `${index}. `)]
              : []),
            ...wordRuns(n),
          ],
          heading:
            n.type === "heading"
              ? n.attrs?.level === 2
                ? HeadingLevel.HEADING_2
                : n.attrs?.level === 3
                  ? HeadingLevel.HEADING_3
                  : HeadingLevel.HEADING_1
              : undefined,
          indent: depth ? { left: Math.min(depth, 5) * 300 } : undefined,
          keepNext: n.type === "heading",
          widowControl: true,
          spacing: {
            after: n.type === "heading" ? 140 : 140,
            before: n.type === "heading" ? 280 : 0,
            line: 290,
          },
        }),
      );
      return;
    }
    (n.content || []).forEach((c) => block(c, depth));
  }
  (doc.content.content || []).forEach((n) => block(n));
  return Packer.toBuffer(
    new Document({
      creator: "Pupuce Intelligence",
      title: doc.title,
      styles: {
        default: {
          document: {
            run: { font: "Georgia", size: 24, color: "222222" },
            paragraph: { spacing: { line: 290, after: 140 } },
          },
        },
        paragraphStyles: [
          {
            id: "Title",
            name: "Title",
            basedOn: "Normal",
            run: { font: "Georgia", size: 48, color: "000000" },
            paragraph: { spacing: { after: 360 } },
          },
          {
            id: "Heading1",
            name: "Heading 1",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: { font: "Georgia", size: 32, color: "000000" },
            paragraph: { keepNext: true },
          },
          {
            id: "Heading2",
            name: "Heading 2",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: { font: "Georgia", size: 28, color: "000000" },
            paragraph: { keepNext: true },
          },
          {
            id: "Heading3",
            name: "Heading 3",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: { font: "Georgia", size: 25, bold: true, color: "000000" },
            paragraph: { keepNext: true },
          },
        ],
      },
      sections: [
        {
          properties: {
            page: {
              size: { width: 11906, height: 16838 },
              margin: { top: 1250, bottom: 1250, left: 1350, right: 1350 },
            },
          },
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      children: [PageNumber.CURRENT],
                      font: "Georgia",
                      size: 18,
                      color: "777777",
                    }),
                  ],
                }),
              ],
            }),
          },
          children,
        },
      ],
    }),
  );
}
export async function exportPdf(doc: ResearchDocument): Promise<Buffer> {
  const pdf = new PDFDocument({
    size: "A4",
    margins: { top: 60, bottom: 62, left: 64, right: 64 },
    bufferPages: true,
    info: { Title: doc.title, Author: "Pupuce Intelligence" },
  });
  const chunks: Buffer[] = [];
  const result = new Promise<Buffer>((resolve, reject) => {
    pdf.on("data", (c) => chunks.push(c));
    pdf.on("end", () => resolve(Buffer.concat(chunks)));
    pdf.on("error", reject);
  });
  const font = (name: string) => join(process.cwd(), "public", "fonts", name);
  pdf.registerFont("Body", font("garamond-regular.woff"));
  pdf.registerFont("Italic", font("garamond-italic.woff"));
  pdf.registerFont("Bold", font("garamond-semibold.woff"));
  pdf.registerFont("BoldItalic", font("garamond-semibold-italic.woff"));
  const left = 64,
    width = pdf.page.width - 128,
    bottom = pdf.page.height - 62;
  function ensure(height: number) {
    if (pdf.y + height > bottom) pdf.addPage();
  }
  function inline(n: RichNode, indent = 0, prefix = "") {
    const runs: RichNode[] = [];
    function collect(c: RichNode) {
      if (c.type === "text" || c.type === "hardBreak") runs.push(c);
      else (c.content || []).forEach(collect);
    }
    collect(n);
    if (!runs.length) {
      pdf.moveDown(0.4);
      return;
    }
    pdf.font("Body").fontSize(12.5).fillColor("#222222");
    const x = left + indent;
    if (prefix) runs.unshift({ type: "text", text: prefix });
    runs.forEach((r, i) => {
      const bold = r.marks?.some((m) => m.type === "bold"),
        italic = r.marks?.some((m) => m.type === "italic");
      pdf.font(
        bold && italic
          ? "BoldItalic"
          : bold
            ? "Bold"
            : italic
              ? "Italic"
              : "Body",
      );
      const options: PDFKit.Mixins.TextOptions = {
        width: width - indent,
        continued: i < runs.length - 1,
        lineGap: 3,
        underline: r.marks?.some((m) => m.type === "underline"),
        strike: r.marks?.some((m) => m.type === "strike"),
        link: r.marks?.find((m) => m.type === "link")?.attrs?.href,
      };
      const text = r.type === "hardBreak" ? "\n" : r.text || "";
      if (i === 0) pdf.text(text, x, pdf.y, options);
      else pdf.text(text, options);
    });
    pdf.x = left;
    pdf.moveDown(0.6);
  }
  function block(
    n: RichNode,
    depth = 0,
    list?: "bullet" | "number",
    index = 1,
  ) {
    if (n.type === "image") {
      const img = image(n),
        scale = Math.min(width / img.width, 360 / img.height, 1),
        h = img.height * scale,
        w = img.width * scale;
      ensure(h + 55);
      pdf.image(img.buffer, left + (width - w) / 2, pdf.y, {
        width: w,
        height: h,
      });
      pdf.y += h + 12;
      return;
    }
    if (n.type === "heading") {
      ensure(100);
      pdf
        .font("Bold")
        .fontSize(n.attrs?.level === 1 ? 20 : 16)
        .fillColor("#111111")
        .text(textOf(n), left, pdf.y, { width, lineGap: 1 });
      pdf.moveDown(0.5);
      return;
    }
    if (n.type === "bulletList" || n.type === "orderedList") {
      (n.content || []).forEach((c, i) =>
        block(
          c,
          depth,
          n.type === "bulletList" ? "bullet" : "number",
          (n.attrs?.start || 1) + i,
        ),
      );
      return;
    }
    if (n.type === "listItem") {
      (n.content || []).forEach((c, i) =>
        block(c, depth + 1, i === 0 ? list : undefined, index),
      );
      return;
    }
    if (n.type === "blockquote") {
      (n.content || []).forEach((c) => block(c, depth + 1));
      return;
    }
    if (n.type === "paragraph") {
      ensure(35);
      inline(
        n,
        Math.min(depth, 5) * 14,
        list === "bullet" ? "• " : list === "number" ? `${index}. ` : "",
      );
      return;
    }
    if (n.type === "horizontalRule") {
      pdf.moveDown();
      return;
    }
    (n.content || []).forEach((c) => block(c, depth));
  }
  try {
    pdf
      .font("Body")
      .fontSize(30)
      .fillColor("#111111")
      .text(doc.title, { width, lineGap: 1 });
    pdf.moveDown(0.8);
    (doc.content.content || []).forEach((n) => block(n));
    const range = pdf.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      pdf.switchToPage(i);
      const margin = pdf.page.margins.bottom;
      pdf.page.margins.bottom = 0;
      pdf
        .font("Body")
        .fontSize(10)
        .fillColor("#777777")
        .text(String(i + 1), left, pdf.page.height - 42, {
          width,
          align: "center",
          lineBreak: false,
        });
      pdf.page.margins.bottom = margin;
    }
    pdf.end();
    return await result;
  } catch (error) {
    pdf.destroy();
    throw error;
  }
}
