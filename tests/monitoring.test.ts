import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { recordRun, readRuns } from '../lib/monitoring';
test('monitoring preserves prompt and provider usage without double-counting polls', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'pupuce-monitoring-'));
  const old = process.env.PUPUCE_MONITORING_DIR;
  process.env.PUPUCE_MONITORING_DIR = dir;
  try {
    await recordRun('run-1', { prompt: 'Mon prompt', status: 'running' });
    for (let i=0;i<2;i++) await recordRun('run-1', { output: 'Réponse', status: 'completed', usage: { input_tokens: 42, output_tokens: 8 } });
    const runs = await readRuns();
    assert.equal(runs.length, 1);
    assert.equal(runs[0].prompt, 'Mon prompt');
    assert.equal(runs[0].usage.input_tokens, 42);
    await assert.rejects(recordRun('../escape', {}));
  } finally {
    if (old === undefined) delete process.env.PUPUCE_MONITORING_DIR; else process.env.PUPUCE_MONITORING_DIR = old;
    await rm(dir, { recursive: true, force: true });
  }
});
