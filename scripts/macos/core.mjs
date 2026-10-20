import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync, chmodSync, existsSync } from 'node:fs';
export const secret = () => randomBytes(32).toString('hex');
export function readEnv(path) {
  if (!existsSync(path)) return {};
  return Object.fromEntries(readFileSync(path, 'utf8').split('\n').flatMap(line => {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    return m ? [[m[1], m[2]]] : [];
  }));
}
export function updateEnv(path, values) {
  const old = existsSync(path) ? readFileSync(path, 'utf8') : '';
  const pending = new Map(Object.entries(values));
  const lines = old.split('\n').map(line => {
    const key = line.match(/^([A-Z_][A-Z0-9_]*)=/)?.[1];
    if (!key || !(key in values)) return line;
    if (!pending.has(key)) return null;
    pending.delete(key);
    return `${key}=${values[key]}`;
  }).filter(line => line !== null);
  for (const [key, value] of pending) lines.push(`${key}=${value}`);
  writeFileSync(path, lines.join('\n').replace(/\n*$/, '\n'), { mode: 0o600 });
  chmodSync(path, 0o600);
}
export const terminalStatus = status => ['completed', 'failed', 'cancelled', 'interrupted', 'unknown'].includes(status);
