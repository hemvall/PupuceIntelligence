import { mkdir, readFile, readdir, writeFile, rename } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
const directory = () => process.env.PUPUCE_MONITORING_DIR || join(homedir(), 'Library', 'Application Support', 'Pupuce Intelligence', 'monitoring');
export async function recordRun(id: string, value: Record<string, unknown>) {
  if (!/^[a-zA-Z0-9_-]{1,160}$/.test(id)) throw new Error('Invalid run ID');
  const dir = directory();
  await mkdir(dir, { recursive: true, mode: 0o700 });
  const file = join(dir, id + '.json');
  let previous = {};
  try { previous = JSON.parse(await readFile(file, 'utf8')); } catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; }
  const temp = file + '.' + crypto.randomUUID() + '.tmp';
  await writeFile(temp, JSON.stringify({ ...previous, ...value, updatedAt: new Date().toISOString() }), { mode: 0o600 });
  await rename(temp, file);
}
export async function readRuns() {
  let names: string[];
  try { names = await readdir(directory()); } catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return []; throw e; }
  return (await Promise.all(names.filter(n => n.endsWith('.json')).map(async n => JSON.parse(await readFile(join(directory(), n), 'utf8'))))).sort((a,b) => b.updatedAt.localeCompare(a.updatedAt));
}
