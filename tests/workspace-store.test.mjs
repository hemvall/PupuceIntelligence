import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadWorkspace, saveWorkspace } from '../lib/workspace-store.ts';
test('migrates browser data once, serializes disk writes, and fails closed', async () => {
  globalThis.window = { location: { origin: 'http://127.0.0.1:3210' } };
  globalThis.localStorage = { getItem: () => 'old browser workspace' };
  let disk = { value: null, revision: null };
  const seen = [];
  let failure = false;
  globalThis.fetch = async (_url, options) => {
    if (failure) return { ok: false, json: async () => ({ error: 'Disk unavailable' }) };
    if (options.method === 'PUT') {
      const body = JSON.parse(options.body);
      seen.push(body);
      assert.equal(body.revision, disk.revision);
      disk = { value: body.value, revision: String(seen.length) };
    }
    return { ok: true, json: async () => disk };
  };
  try {
    assert.equal(await loadWorkspace(), 'old browser workspace');
    await Promise.all([saveWorkspace('migration'), saveWorkspace('edited')]);
    assert.equal(disk.value, 'edited');
    assert.equal(await loadWorkspace(), 'edited');
    assert.deepEqual(seen.map(x => x.revision), [null, '1']);
    failure = true;
    await assert.rejects(loadWorkspace(), /Disk unavailable/);
    await assert.rejects(saveWorkspace('lost'), /Disk unavailable/);
    assert.equal(disk.value, 'edited');
  } finally { delete globalThis.window; delete globalThis.localStorage; delete globalThis.fetch; }
});
