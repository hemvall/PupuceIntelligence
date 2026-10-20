// Real Next production server and launcher lifecycle; Hermes is a local fixture, never a paid API.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
const root = resolve('.');
const data = mkdtempSync(join(tmpdir(), 'pupuce-launcher-'));
const bin = join(data, 'bin');
mkdirSync(bin); mkdirSync(join(data, 'hermes'));
symlinkSync(root, join(data, 'app'));
writeFileSync(join(data, 'local.env'), 'HERMES_URL=http://127.0.0.1:8642\nHERMES_API_KEY=fixture-hermes-secret\nAPP_ACCESS_KEY=fixture-app-secret\n');
writeFileSync(join(bin, 'hermes'), `#!/usr/bin/env node
const http=require('node:http');
http.createServer((req,res)=>{
  if(req.headers.authorization!=='Bearer fixture-hermes-secret'){res.writeHead(401);return res.end('{}');}
  res.setHeader('Content-Type','application/json');
  if(req.url==='/v1/models')return res.end('{"data":[]}');
  if(req.url==='/v1/runs'&&req.method==='POST')return res.end('{"run_id":"fixture-run"}');
  if(req.url==='/v1/runs/fixture-run')return res.end('{"run_id":"fixture-run","status":"completed","output":"Réponse du service simulé"}');
  res.writeHead(404);res.end('{}');
}).listen(8642,'127.0.0.1');
`, { mode: 0o700 });
writeFileSync(join(bin, 'open'), '#!/bin/bash\nprintf "%s" "$1" > "$PUPUCE_DATA/opened-url"\n', { mode: 0o700 });
// Some Linux execution sandboxes expose host /proc PIDs to ps while Node uses a PID namespace.
// Adapt ps only in that environment; macOS CI always uses the native ps implementation.
if (process.platform === 'linux' && spawnSync('ps', ['-p', String(process.pid), '-o', 'lstart=']).status !== 0) {
  writeFileSync(join(bin, 'ps'), `#!/usr/bin/env node
const fs=require('node:fs');
const pid=process.argv[process.argv.indexOf('-p')+1];
for(const dir of fs.readdirSync('/proc').filter(x=>/^[0-9]+$/.test(x))){
 try {
  const status=fs.readFileSync('/proc/'+dir+'/status','utf8');
  const ids=status.match(/^NSpid:\\s+(.+)$/m)?.[1].trim().split(/\\s+/);
  if(ids?.at(-1)!==pid)continue;
  const stat=fs.readFileSync('/proc/'+dir+'/stat','utf8').split(') ')[1].split(' ');
  console.log(stat[19]+' '+pid);process.exit(0);
 }catch{}
}
process.exit(1);
`, {mode:0o700});
}
const env = { ...process.env, PUPUCE_DATA: data, PUPUCE_TEST_MODE: '1', PATH: `${bin}:${process.env.PATH}` };
async function command(action) {
  const child = spawn(process.execPath, ['scripts/macos/pupuce.mjs', action], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  child.stdout.on('data', x => { output += x; }); child.stderr.on('data', x => { output += x; });
  const code = await new Promise((resolve, reject) => { child.on('error', reject); child.on('exit', resolve); });
  assert.equal(code, 0, output);
  assert.ok(!output.includes('fixture-app-secret') && !output.includes('fixture-hermes-secret'));
}
try {
  await command('start');
  const first = JSON.parse(readFileSync(join(data, 'processes.json'), 'utf8'));
  const opened = readFileSync(join(data, 'opened-url'), 'utf8');
  const response = await fetch(opened, { redirect: 'manual' });
  assert.equal(response.status, 303);
  const cookie = response.headers.get('set-cookie').split(';')[0];
  const base = 'http://127.0.0.1:3210/api/hermes/runs';
  const body = JSON.stringify({ message: 'Test', context: 'Fixture', sessionId: 'pupuce-fixture', requestId: '951d8980-a750-45b6-bbea-3ee3ec23f3c5' });
  assert.equal((await fetch(base, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })).status, 401);
  const run = await fetch(base, { method: 'POST', headers: { 'Content-Type': 'application/json', cookie }, body });
  assert.equal(run.status, 202);
  assert.equal((await run.json()).run_id, 'fixture-run');
  const poll = await fetch(`${base}/fixture-run`, { headers: { cookie } });
  assert.equal((await poll.json()).output, 'Réponse du service simulé');
  assert.equal((await fetch(base, { method: 'POST', headers: { 'Content-Type': 'application/json', cookie, origin: 'https://attacker.example' }, body })).status, 401);
  await command('start');
  const second = JSON.parse(readFileSync(join(data, 'processes.json'), 'utf8'));
  assert.equal(first.app.pid, second.app.pid);
  assert.equal(first.hermes.pid, second.hermes.pid);
  assert.equal((await fetch(readFileSync(join(data, 'opened-url'), 'utf8'), { redirect: 'manual' })).status, 303);
  await command('stop');
  assert.equal(existsSync(join(data, 'processes.json')), false);
  await assert.rejects(fetch('http://127.0.0.1:3210', { signal: AbortSignal.timeout(2000) }));
  console.log('✓ Launcher: startup, cookie, bridge round-trip, cross-site rejection, reopen and shutdown passed (mock Hermes).');
} finally {
  try { await command('stop'); } finally { rmSync(data, { recursive: true, force: true }); }
}
