import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readWorkspace, writeWorkspace } from '../lib/local-workspace.mjs';
test('disk persistence, revisions, retained history and concurrent conflict', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'pupuce-'));
  try {
    assert.deepEqual(await readWorkspace(dir), { value: null, revision: null });
    const first = JSON.stringify({ notes: 'cours', image: 'data:image/png;base64,aGVsbG8=' });
    let saved = await writeWorkspace(first, null, dir);
    assert.equal((await readWorkspace(dir)).value, first);
    await assert.rejects(writeWorkspace('stale', null, dir), { status: 409 });
    const results = await Promise.allSettled([writeWorkspace('window A', saved.revision, dir), writeWorkspace('window B', saved.revision, dir)]);
    assert.equal(results.filter(x => x.status === 'fulfilled').length, 1);
    assert.equal((await readWorkspace(dir)).value, 'window A');
    for (let i = 0; i < 12; i++) {
      saved = await readWorkspace(dir);
      await writeWorkspace(String(i), saved.revision, dir);
    }
    assert.equal((await readdir(join(dir, 'Historique'))).length, 10);
    assert.equal(await readFile(join(dir, 'atelier.json'), 'utf8'), '11');
    assert.equal((await readdir(dir)).filter(x => x.endsWith('.tmp')).length, 0);
    await writeFile(join(dir, 'atelier.json'), 'corrupt');
    await assert.rejects(writeWorkspace('overwrite', saved.revision, dir), { status: 409 });
    assert.equal((await readWorkspace(dir)).value, 'corrupt');
  } finally { await rm(dir, { recursive: true, force: true }); }
});
