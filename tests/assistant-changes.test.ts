import test from 'node:test';
import assert from 'node:assert/strict';
import { assistantResponse } from '../lib/assistant-changes';
import { workspaceSchema } from '../lib/workspace';
import { initialWorkspace } from '../lib/seed';
test('change proposal remains pending through save and restore without modifying notes', () => {
  const w = initialWorkspace();
  const p = w.projects[0];
  const original = p.notes;
  const response = assistantResponse('Voici ma proposition.\n```pupuce-change\n{"summary":"Ajout du plan","notes":"Nouveau plan"}\n```');
  assert.ok(response.change);
  p.messages.push({ id: 'proposal', role: 'assistant', content: response.content, change: { ...response.change, baseNotes: p.notes, baseDocument: 'null', state: 'pending' } });
  const restored = workspaceSchema.parse(JSON.parse(JSON.stringify(w)));
  assert.equal(restored.projects[0].notes, original);
  assert.equal(restored.projects[0].messages.at(-1)?.change?.state, 'pending');
});
test('invalid edits are never exposed as an actionable proposal', () => {
  assert.equal(assistantResponse('```pupuce-change\n{"summary":"Delete all"}\n```').change, undefined);
  assert.equal(assistantResponse('Plain answer').content, 'Plain answer');
});
