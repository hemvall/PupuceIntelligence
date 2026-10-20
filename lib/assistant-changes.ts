import { z } from 'zod';
import { documentSchema } from './document/model';
export const changeSchema = z.object({
  summary: z.string().min(1).max(1000),
  notes: z.string().max(100000).optional(),
  document: documentSchema.optional(),
}).refine(p => p.notes !== undefined || p.document !== undefined);
export type AssistantChange = z.infer<typeof changeSchema> & { baseNotes: string; baseDocument: string; state: 'pending' | 'accepted' | 'rejected' };
export function assistantResponse(output: string) {
  const match = output.match(/```pupuce-change\s*\n([\s\S]*?)```/);
  if (!match) return { content: output };
  try {
    const change = changeSchema.parse(JSON.parse(match[1]));
    return { content: output.replace(match[0], '').trim(), change };
  } catch { return { content: output.replace(match[0], '').trim() + '\nLa proposition est invalide. Demande une nouvelle version.' }; }
}
