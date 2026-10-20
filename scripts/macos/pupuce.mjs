import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, existsSync, cpSync, readFileSync, writeFileSync, openSync, closeSync, chmodSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { createServer } from 'node:net';
import { randomUUID } from 'node:crypto';
import { secret, updateEnv, readEnv, terminalStatus } from './core.mjs';
const source = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const data = process.env.PUPUCE_DATA || join(homedir(), 'Library/Application Support/PupuceIntelligence');
const app = join(data, 'app');
const hermesHome = join(data, 'hermes');
const configPath = join(data, 'local.env');
const statePath = join(data, 'processes.json');
const logs = join(data, 'logs');
const action = process.argv[2] || 'start';
process.umask(0o077);
const env = { ...process.env, HERMES_HOME: hermesHome };
const sleep = ms => new Promise(r => setTimeout(r, ms));
function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', env, ...options });
  if (result.error || result.status !== 0) throw new Error(`Échec de ${basename(command)}. Consulte le message ci-dessus.`);
}
async function ask(message) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try { return (await rl.question(message)).trim(); } finally { rl.close(); }
}
function hermesBinary() {
  const paths = [join(homedir(), '.local/bin/hermes')];
  const found = spawnSync('/bin/bash', ['-c', 'command -v hermes'], { env, encoding: 'utf8' });
  if (found.status === 0) paths.unshift(found.stdout.trim());
  const binary = paths.find(p => existsSync(p));
  if (!binary) throw new Error('Hermes est absent. Relance Installer-Pupuce.command.');
  return binary;
}
function processIdentity(pid) {
  const r = spawnSync('ps', ['-p', String(pid), '-o', 'lstart=', '-o', 'pgid='], { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : '';
}
function loadState() {
  try { return JSON.parse(readFileSync(statePath, 'utf8')); } catch { return {}; }
}
function alive(record) { return record?.identity && processIdentity(record.pid) === record.identity; }
async function stop() {
  const state = loadState();
  for (const record of [state.app, state.hermes]) {
    if (!alive(record)) continue;
    try { process.kill(-record.pid, 'SIGTERM'); } catch { /* Already stopped. */ }
  }
  for (let i = 0; i < 60 && [state.app, state.hermes].some(alive); i++) await sleep(500);
  if ([state.app, state.hermes].some(alive)) throw new Error('Une recherche termine encore son arrêt. Réessaie dans un instant.');
  rmSync(statePath, { force: true });
  console.log('Pupuce est arrêtée. Les dossiers du navigateur sont conservés.');
}
async function portFree(port) {
  return new Promise(resolve => {
    const server = createServer();
    server.once('error', () => resolve(false));
    server.listen(port, '127.0.0.1', () => server.close(() => resolve(true)));
  });
}
function background(command, args, filename, extraEnv, cwd) {
  const fd = openSync(join(logs, filename), 'a', 0o600);
  const child = spawn(command, args, { cwd, env: { ...env, ...extraEnv }, detached: true, stdio: ['ignore', fd, fd] });
  child.on('error', error => { child.startError = error; });
  child.unref(); closeSync(fd);
  return child;
}
async function waitFor(url, headers = {}, child) {
  for (let i = 0; i < 90; i++) {
    if (child?.startError) throw new Error('Impossible de lancer le service. Relance l’installation.');
    if (child?.exitCode !== null && child?.exitCode !== undefined) break;
    try { const r = await fetch(url, { headers, signal: AbortSignal.timeout(1500) }); if (r.ok) return; } catch {}
    if (i % 15 === 0) console.log('Démarrage en cours…');
    await sleep(1000);
  }
  throw new Error(`Service indisponible. Consulte les journaux dans ${logs}`);
}
async function start(openBrowser = true) {
  if (!existsSync(configPath) || !existsSync(join(app, '.next/BUILD_ID'))) throw new Error('Lance d’abord Installer-Pupuce.command.');
  const config = readEnv(configPath);
  if (alive(loadState().app) && alive(loadState().hermes)) {
    await waitFor('http://127.0.0.1:3210');
    if (openBrowser) run('open', [`http://127.0.0.1:3210/api/local/open?token=${loadState().launchToken}`]);
    return config;
  }
  await stop();
  for (const port of [3210, 8642]) if (!await portFree(port)) throw new Error(`Le port ${port} est occupé par un autre service. Arrête-le puis réessaie.`);
  const state = {};
  try {
    const gateway = background(hermesBinary(), ['gateway'], 'hermes.log', {
      API_SERVER_ENABLED: 'true', API_SERVER_HOST: '127.0.0.1', API_SERVER_PORT: '8642', API_SERVER_KEY: config.HERMES_API_KEY,
    }, hermesHome);
    await sleep(500);
    state.hermes = { pid: gateway.pid, identity: processIdentity(gateway.pid) };
    writeFileSync(statePath, JSON.stringify(state));
    await waitFor('http://127.0.0.1:8642/v1/models', { Authorization: `Bearer ${config.HERMES_API_KEY}` }, gateway);
    const launchToken = secret();
    const next = background(process.execPath, [join(app, 'node_modules/next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', '3210'], 'pupuce.log', {
      ...config, NODE_ENV: 'production', PUPUCE_LOCAL_MODE: 'true', PUPUCE_LAUNCH_TOKEN: launchToken,
    }, app);
    await sleep(500);
    state.app = { pid: next.pid, identity: processIdentity(next.pid) };
    state.launchToken = launchToken;
    writeFileSync(statePath, JSON.stringify(state));
    await waitFor('http://127.0.0.1:3210', {}, next);
    if (openBrowser) run('open', [`http://127.0.0.1:3210/api/local/open?token=${launchToken}`]);
    console.log('Pupuce est prête : http://127.0.0.1:3210');
    console.log('Tu peux fermer ce Terminal. Utilise toujours cette adresse et le même navigateur pour retrouver tes dossiers.');
    return config;
  } catch (e) { await stop(); throw e; }
}
async function smoke() {
  const config = await start(false);
  const base = 'http://127.0.0.1:3210/api/hermes/runs';
  const headers = { 'Content-Type': 'application/json', 'x-app-access-key': config.APP_ACCESS_KEY };
  const r = await fetch(base, { method: 'POST', headers, body: JSON.stringify({ message: 'Réponds uniquement : Pupuce est prête.', context: 'Test de connexion. Aucun outil nécessaire.', sessionId: `pupuce-test-${randomUUID()}`, requestId: randomUUID() }), signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`Le pont IA refuse la connexion (HTTP ${r.status}). Lance Configurer-IA.command.`);
  const { run_id } = await r.json();
  try {
    for (let i = 0; i < 120; i++) {
      const poll = await fetch(`${base}/${encodeURIComponent(run_id)}`, { headers, signal: AbortSignal.timeout(20000) });
      if (!poll.ok) throw new Error(`Suivi IA indisponible (HTTP ${poll.status}).`);
      const result = await poll.json();
      if (terminalStatus(result.status)) {
        if (result.status !== 'completed' || typeof result.output !== 'string' || !result.output.trim()) throw new Error('Le modèle n’a pas répondu. Vérifie le fournisseur, le modèle et le crédit API avec Configurer-IA.command.');
        console.log('✓ Une vraie réponse IA a été reçue à travers Pupuce.'); return;
      }
      if (i % 10 === 0) console.log('Test de réponse IA en cours…');
      await sleep(1000);
    }
    throw new Error('Le test IA a dépassé deux minutes. Vérifie la configuration du modèle.');
  } finally {
    await fetch(`${base}/${encodeURIComponent(run_id)}`, { method: 'POST', headers, signal: AbortSignal.timeout(20000) }).catch(() => {});
  }
}
function shortcuts() {
  const desktop = join(homedir(), 'Desktop');
  if (!existsSync(desktop)) return;
  for (const [name, command] of [['Pupuce', 'start'], ['Arrêter-Pupuce', 'stop'], ['Configurer-IA', 'configure'], ['Diagnostic-Pupuce', 'doctor']]) {
    const quote = value => "'" + value.replaceAll("'", "'\\''") + "'";
    const contents = `#!/bin/bash\ncd ${quote(app)} || exit 1\nsource scripts/macos/bootstrap.sh || exit 1\nnode scripts/macos/pupuce.mjs ${quote(command)}\nresult=$?\nif [ "$result" != 0 ] || [ ${quote(command)} != start ]; then read -r -p 'Entrée pour fermer…'; fi\nexit "$result"\n`;
    const path = join(desktop, `${name}.command`); writeFileSync(path, contents, { mode: 0o700 }); chmodSync(path, 0o700);
  }
}
async function configure() {
  await stop();
  console.log('Choisis ton fournisseur API et ton modèle dans Hermes. Saisis la clé uniquement dans son assistant, jamais dans GitHub.');
  run(hermesBinary(), ['model']);
  console.log('Configuration enregistrée. Un accès API à un modèle est nécessaire ; l’abonnement ChatGPT seul ne le fournit pas.');
}
async function install() {
  mkdirSync(data, { recursive: true, mode: 0o700 });
  mkdirSync(logs, { recursive: true, mode: 0o700 });
  await stop();
  if (source !== app) {
    mkdirSync(app, { recursive: true });
    cpSync(source, app, { recursive: true, filter: path => !['.git', 'node_modules', '.next'].includes(basename(path)) && (!basename(path).startsWith('.env') || basename(path) === '.env.example') });
  }
  console.log('Installation de Pupuce (le premier lancement nécessite Internet)…');
  run('npm', ['ci'], { cwd: app });
  run('npm', ['run', 'build'], { cwd: app });
  mkdirSync(hermesHome, { recursive: true, mode: 0o700 });
  let binary;
  try { binary = hermesBinary(); } catch {
    if (process.arch !== 'arm64') throw new Error('L’installation officielle Hermes pour Mac nécessite Apple Silicon.');
    if (spawnSync('xcode-select', ['-p'], { stdio: 'ignore' }).status !== 0) {
      spawnSync('xcode-select', ['--install'], { stdio: 'inherit' });
      throw new Error('Termine l’installation des outils Apple puis relance Installer-Pupuce.command.');
    }
    console.log('Installation officielle de Hermes. Les outils navigateur et contrôle du Mac ne sont pas installés.');
    const installer = join(data, 'hermes-install.sh');
    run('curl', ['--fail', '--location', '--silent', '--show-error', 'https://hermes-agent.nousresearch.com/install.sh', '-o', installer]);
    run('/bin/bash', [installer, '--non-interactive', '--skip-browser', '--skip-computer-use', '--dir', join(data, 'hermes-agent')]);
    binary = hermesBinary();
  }
  const previous = readEnv(configPath);
  const key = previous.HERMES_API_KEY || secret();
  updateEnv(configPath, { HERMES_URL: 'http://127.0.0.1:8642', HERMES_API_KEY: key, APP_ACCESS_KEY: previous.APP_ACCESS_KEY || secret() });
  updateEnv(join(hermesHome, '.env'), { API_SERVER_ENABLED: 'true', API_SERVER_HOST: '127.0.0.1', API_SERVER_PORT: '8642', API_SERVER_KEY: key });
  console.log('Le profil Pupuce est séparé de tes autres configurations Hermes.');
  if (!existsSync(join(hermesHome, 'config.yaml')) || (await ask('Configurer ou changer le fournisseur IA maintenant ? [O/n] ')).toLowerCase() !== 'n') run(binary, ['model']);
  console.log('Choisis les outils de recherche web pour Pupuce. Les clés de recherche éventuelles se configurent dans Hermes. Évite les outils terminal/ordinateur pour ce profil documentaire.');
  run(binary, ['tools']);
  shortcuts();
  await start();
  if ((await ask('Tester une vraie réponse IA (petit appel facturé par ton fournisseur) ? [O/n] ')).toLowerCase() !== 'n') await smoke();
  console.log('Installation terminée. Les raccourcis sont sur le Bureau. Pense à exporter une sauvegarde JSON de tes dossiers.');
}
async function doctor() {
  console.log(`Installation : ${app}\nJournaux : ${logs}`);
  console.log(`Node : ${process.versions.node}`);
  const config = readEnv(configPath);
  for (const name of ['HERMES_URL', 'HERMES_API_KEY', 'APP_ACCESS_KEY']) console.log(`${name} : ${config[name] ? 'configuré' : 'absent'}`);
  const state = loadState();
  console.log(`Pupuce : ${alive(state.app) ? 'en cours' : 'arrêtée'} ; Hermes : ${alive(state.hermes) ? 'en cours' : 'arrêté'}`);
  if ((await ask('Démarrer et tester une vraie réponse IA (appel facturé) ? [o/N] ')).toLowerCase() === 'o') await smoke();
}
if (process.platform !== 'darwin' && process.env.PUPUCE_TEST_MODE !== '1') throw new Error('Ce lanceur est prévu pour macOS.');
const lockPath = join(data, 'launcher.lock');
let ownsLock = false;
try {
  mkdirSync(logs, { recursive: true, mode: 0o700 });
  try { mkdirSync(lockPath); } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    let owner;
    try { owner = JSON.parse(readFileSync(join(lockPath, 'owner.json'), 'utf8')); } catch {
      throw new Error('Une autre ouverture est en cours. Attends quelques secondes puis réessaie. Si le problème persiste après redémarrage du Mac, supprime launcher.lock dans le dossier d’installation.');
    }
    if (alive(owner)) throw new Error('Une ouverture ou configuration de Pupuce est déjà en cours. Termine-la avant de réessayer.');
    rmSync(lockPath, { recursive: true }); mkdirSync(lockPath);
  }
  ownsLock = true;
  writeFileSync(join(lockPath, 'owner.json'), JSON.stringify({ pid: process.pid, identity: processIdentity(process.pid) }));
  if (action === 'install') await install();
  else if (action === 'start') await start();
  else if (action === 'stop') await stop();
  else if (action === 'configure') await configure();
  else if (action === 'doctor') await doctor();
  else throw new Error('Commande inconnue.');
} catch (error) { console.error(`\n${error.message}`); process.exitCode = 1; }
finally { if (ownsLock) rmSync(lockPath, { recursive: true, force: true }); }
