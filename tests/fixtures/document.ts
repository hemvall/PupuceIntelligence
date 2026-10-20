import { readFileSync } from "node:fs";
import { dossierSections } from "../../lib/dossier";
import {
  heading,
  paragraph,
  type ResearchDocument,
} from "../../lib/document/model";
export function specimen(): ResearchDocument {
  return {
    title: "L’Ange déchu d’Alexandre Cabanel",
    updatedAt: "2026-10-20",
    origin: "example",
    content: {
      type: "doc",
      content: [
        paragraph(
          "Une étude de l’œuvre de 1847 conservée au musée Fabre. Ce document distingue les faits documentés des interprétations proposées.",
        ),
        {
          type: "image",
          attrs: {
            src:
              "data:image/jpeg;base64," +
              readFileSync("public/art/fallen-angel.jpg").toString("base64"),
            alt: "Alexandre Cabanel, L’Ange déchu, 1847",
          },
        },
        paragraph(
          "Alexandre Cabanel, L’Ange déchu, 1847. Photo Rvalette / Wikimedia Commons, CC BY-SA 3.0. https://commons.wikimedia.org/wiki/File:Cabanel-L%27ange_d%C3%A9chu.JPG",
        ),
        ...dossierSections.flatMap((s) => [
          heading(s.title),
          ...s.paragraphs.map(paragraph),
        ]),
        heading("Notes personnelles"),
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Une observation en gras. ",
              marks: [{ type: "bold" }],
            },
            {
              type: "text",
              text: "Une interprétation en italique.",
              marks: [{ type: "italic" }],
            },
          ],
        },
        {
          type: "orderedList",
          attrs: { start: 1 },
          content: [
            {
              type: "listItem",
              content: [paragraph("Vérifier la notice du musée.")],
            },
            {
              type: "listItem",
              content: [
                paragraph("Comparer les œuvres et documenter les écarts."),
              ],
            },
          ],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Musée Fabre",
              marks: [
                {
                  type: "link",
                  attrs: { href: "https://www.museefabre.fr/lange-dechu" },
                },
              ],
            },
          ],
        },
      ],
    },
  };
}
