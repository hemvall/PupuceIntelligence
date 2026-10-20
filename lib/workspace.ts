import { z } from "zod";
import { documentSchema, jobSchema } from "./document/model";
import { changeSchema } from "./assistant-changes";
const source = z.object({
  id: z.string(),
  title: z.string(),
  creator: z.string(),
  date: z.string(),
  kind: z.enum(["Œuvre", "Ouvrage", "Portail", "Cours", "Article"]),
  institution: z.string(),
  url: z.string(),
  description: z.string(),
  image: z.string().optional(),
  imageUrl: z.string().optional(),
  rights: z.string().optional(),
  inventory: z.string().optional(),
  access: z.enum([
    "Notice consultée",
    "Texte importé",
    "Portail de recherche",
    "Page consultée",
    "Passage consulté",
  ]),
  retrievedAt: z.string(),
  text: z.string().optional(),
});
const project = z.object({
  id: z.string(),
  title: z.string(),
  subtitle: z.string(),
  selected: z.array(z.string()),
  notes: z.string(),
  sessionId: z.string(),
  document: documentSchema.optional(),
  documentProposal: documentSchema.optional(),
  previousDocument: documentSchema.optional(),
  documentJob: jobSchema.optional(),
  documentOutline: z.array(z.string().max(250)).max(16).optional(),
  documentBrief: z.string().max(3000).optional(),
  documentError: z.string().optional(),
  activeRunBase: z.object({ notes: z.string(), document: z.string() }).optional(),
  activeRun: z.string().optional(),
  activeRunMessageId: z.string().optional(),
  messages: z.array(
    z.object({
      id: z.string(),
      role: z.enum(["user", "assistant"]),
      content: z.string(),
      change: changeSchema.and(z.object({ baseNotes: z.string(), baseDocument: z.string(), state: z.enum(["pending", "accepted", "rejected"]) })).optional(),
    }),
  ),
});
export const workspaceSchema = z
  .object({
    version: z.literal(1),
    projects: z.array(project).min(1).max(200),
    sources: z.array(source).max(10000),
    activeProject: z.string(),
    theme: z.enum(["light", "dark"]),
  })
  .refine(
    (w) => w.projects.some((p) => p.id === w.activeProject),
    "Dossier actif introuvable",
  );
export function sourceLink(url: string) {
  try {
    const u = new URL(url);
    return ["https:", "http:"].includes(u.protocol) ? u.href : undefined;
  } catch {
    return undefined;
  }
}
