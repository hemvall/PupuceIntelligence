import { z } from 'zod';
export const MAX_FILE_BYTES = 100 * 1024 * 1024;
export const MAX_WORKSPACE_CHARS = 300_000_000;
export const attachmentSchema = z.object({
  name: z.string().min(1).max(250),
  mime: z.enum(['application/pdf', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png', 'image/jpeg', 'image/webp', 'text/plain']),
  size: z.number().int().min(1).max(MAX_FILE_BYTES),
  data: z.string().min(1).max(Math.ceil(MAX_FILE_BYTES / 3) * 4).regex(/^[A-Za-z0-9+/]+={0,2}$/),
  extraction: z.enum(['text', 'partial', 'image', 'empty']),
  warning: z.string().max(1000).optional(),
}).refine(a => a.data.length % 4 === 0 && a.data.length / 4 * 3 - (a.data.endsWith('==') ? 2 : a.data.endsWith('=') ? 1 : 0) === a.size, 'Taille du fichier incohérente');
export type Attachment = z.infer<typeof attachmentSchema>;
