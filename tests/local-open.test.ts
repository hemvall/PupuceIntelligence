import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { GET } from '../app/api/local/open/route';
test('local launcher creates an HttpOnly session and is disabled in hosted mode', () => {
  const previous = { mode: process.env.PUPUCE_LOCAL_MODE, key: process.env.APP_ACCESS_KEY, token: process.env.PUPUCE_LAUNCH_TOKEN };
  try {
    process.env.PUPUCE_LOCAL_MODE = 'true';
    process.env.APP_ACCESS_KEY = 'local-private';
    process.env.PUPUCE_LAUNCH_TOKEN = 'launch-token';
    const req = (token: string, origin?: string) => new NextRequest(`http://127.0.0.1:3210/api/local/open?token=${token}`, { headers: { host: '127.0.0.1:3210', ...(origin ? { origin } : {}) } });
    const response = GET(req('launch-token'));
    assert.equal(response.status, 303);
    assert.equal(response.headers.get('location'), 'http://127.0.0.1:3210/');
    assert.match(response.headers.get('set-cookie') || '', /HttpOnly/i);
    assert.match(response.headers.get('set-cookie') || '', /SameSite=strict/i);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(GET(req('wrong')).status, 403);
    assert.equal(GET(req('launch-token', 'https://attacker.example')).status, 403);
    delete process.env.PUPUCE_LOCAL_MODE;
    assert.equal(GET(req('launch-token')).status, 403);
  } finally {
    for (const [key, value] of Object.entries({ PUPUCE_LOCAL_MODE: previous.mode, APP_ACCESS_KEY: previous.key, PUPUCE_LAUNCH_TOKEN: previous.token })) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
