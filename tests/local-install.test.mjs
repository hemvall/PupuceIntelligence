import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, statSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { updateEnv, readEnv, terminalStatus } from '../scripts/macos/core.mjs';
import { checkAccess } from '../lib/hermes.mjs';
import { equalSecret } from '../lib/local-access.mjs';
const env = { NODE_ENV: 'production', PUPUCE_LOCAL_MODE: 'true', APP_ACCESS_KEY: 'private' };
const request = (headers = {}, url = 'http://127.0.0.1:3210/api/hermes/runs') => new Request(url, { headers: { host: '127.0.0.1:3210', cookie: 'pupuce_local_access=private', ...headers } });
test('local cookie authorizes only the opted-in loopback application', () => {
  assert.equal(checkAccess(request(), env), null);
  assert.equal(checkAccess(request(), { ...env, PUPUCE_LOCAL_MODE: undefined }).status, 401);
  assert.equal(checkAccess(request({}, 'https://pupuce.example/api/hermes/runs'), env).status, 401);
  assert.equal(checkAccess(request({ host: 'attacker.example' }), env).status, 401);
  assert.equal(checkAccess(request({ origin: 'https://attacker.example' }), env).status, 401);
  assert.equal(checkAccess(request({ 'sec-fetch-site': 'cross-site' }), env).status, 401);
  assert.equal(checkAccess(request({ cookie: 'pupuce_local_access=incorrect' }), env).status, 401);
});
test('local env updates preserve provider secrets, remove duplicate settings and protect permissions', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pupuce-'));
  const path = join(dir, 'local.env');
  try {
    writeFileSync(path, '# existing\nPROVIDER_SECRET=keep-me\nAPI_SERVER_KEY=old\nAPI_SERVER_KEY=duplicate\n');
    updateEnv(path, { API_SERVER_KEY: 'new', API_SERVER_HOST: '127.0.0.1' });
    updateEnv(path, { API_SERVER_KEY: 'new', API_SERVER_HOST: '127.0.0.1' });
    assert.deepEqual(readEnv(path), { PROVIDER_SECRET: 'keep-me', API_SERVER_KEY: 'new', API_SERVER_HOST: '127.0.0.1' });
    assert.equal(readFileSync(path, 'utf8').match(/API_SERVER_KEY=/g).length, 1);
    assert.equal(statSync(path).mode & 0o777, 0o600);
  } finally { rmSync(dir, { recursive: true }); }
});
test('empty launch tokens cannot authenticate and uncertain runs stop the setup test', () => {
  assert.equal(equalSecret('', ''), false);
  assert.equal(equalSecret('token', 'token'), true);
  assert.equal(terminalStatus('unknown'), true);
  assert.equal(terminalStatus('running'), false);
});
