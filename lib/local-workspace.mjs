import { mkdir, readFile, writeFile, rename, copyFile, readdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { randomUUID, createHash } from 'node:crypto';
export function workspaceDirectory(env = process.env) {
  return env.PUPUCE_WORKSPACE_DIR || join(homedir(), 'Documents', 'PupuceIntelligence');
}
const revision = value => createHash('sha256').update(value).digest('hex');
export async function readWorkspace(directory = workspaceDirectory()) {
  try {
    const value = await readFile(join(directory, 'atelier.json'), 'utf8');
    return { value, revision: revision(value) };
  } catch (error) {
    if (error.code === 'ENOENT') return { value: null, revision: null };
    throw error;
  }
}
let queue = Promise.resolve();
export function writeWorkspace(value, expectedRevision, directory = workspaceDirectory()) {
  const operation = queue.then(async () => {
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const current = await readWorkspace(directory);
    if (current.revision !== expectedRevision) {
      throw Object.assign(new Error('Le dossier a changé dans une autre fenêtre. Recharge Pupuce avant de continuer.'), { status: 409 });
    }
    const target = join(directory, 'atelier.json');
    if (current.value !== null && current.value !== value) {
      const backups = join(directory, 'Historique');
      await mkdir(backups, { recursive: true, mode: 0o700 });
      await copyFile(target, join(backups, `${Date.now()}-${randomUUID()}.json`));
      const files = (await readdir(backups)).filter(x => /^\d+-[a-f0-9-]+\.json$/.test(x)).sort().reverse();
      for (const file of files.slice(10)) await unlink(join(backups, file));
    }
    const temporary = join(directory, `.atelier-${randomUUID()}.tmp`);
    try {
      await writeFile(temporary, value, { mode: 0o600, flag: 'wx' });
      await rename(temporary, target);
    } finally { await unlink(temporary).catch(() => {}); }
    return { revision: revision(value) };
  });
  queue = operation.catch(() => {});
  return operation;
}
