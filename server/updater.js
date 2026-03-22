import { existsSync, mkdirSync, readdirSync, createWriteStream, readFileSync, symlinkSync, rmSync } from 'fs';
import { readFile, writeFile, rm, cp } from 'fs/promises';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const ROOT         = join(__dirname, '..');
const DATA_DIR     = process.env.MC_DATA_DIR || join(ROOT, 'data');
const IS_INSTALLER = process.env.MC_INSTALL_TYPE === 'installer';
const CONFIG_PATH  = join(DATA_DIR, 'server-config.json');
const CURRENT_PATH = join(DATA_DIR, 'current.json');

// ── Runtime version (read on module init, fresh after each restart) ───────────
function _readPkgVersion() {
  try { return JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8')).version || '0.0.0'; }
  catch { return process.env.APP_VERSION || '0.0.0'; }
}
function _readCurrentSha() {
  try { return JSON.parse(readFileSync(CURRENT_PATH, 'utf-8')).sha || process.env.GIT_SHA || 'unknown'; }
  catch { return process.env.GIT_SHA || 'unknown'; }
}

const _version = _readPkgVersion();
const _sha     = _readCurrentSha();

export function getCurrentVersion() { return _version; }
export function getCurrentSha()     { return _sha; }

// ── Config ────────────────────────────────────────────────────────────────────
const GITHUB_REPO    = 'cragjagged/MovieChain';
const DEFAULT_CONFIG = { updateChannel: 'stable', checkIntervalHours: 24 };

export function readConfigSync() {
  try { return { ...DEFAULT_CONFIG, ...JSON.parse(readFileSync(CONFIG_PATH, 'utf-8')) }; }
  catch { return { ...DEFAULT_CONFIG }; }
}

export async function readConfig() {
  try { return { ...DEFAULT_CONFIG, ...JSON.parse(await readFile(CONFIG_PATH, 'utf-8')) }; }
  catch { return { ...DEFAULT_CONFIG }; }
}

export async function updateConfig(patch) {
  const next = { ...await readConfig(), ...patch };
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  await writeFile(CONFIG_PATH, JSON.stringify(next, null, 2));
  return next;
}

// ── State ─────────────────────────────────────────────────────────────────────
let state = { phase: 'idle' };

export function getUpdateState() { return { ...state }; }

function setState(patch, broadcast) {
  state = { ...state, ...patch };
  broadcast?.(state);
}

// ── Semver ────────────────────────────────────────────────────────────────────
function semverGt(a, b) {
  const pa = String(a).replace(/^v/, '').split('.').map(Number);
  const pb = String(b).replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return true;
    if ((pa[i] || 0) < (pb[i] || 0)) return false;
  }
  return false;
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────
const UA = { 'User-Agent': 'movie-chain-updater/1.0' };

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    function get(u) {
      https.get(u, { headers: UA }, res => {
        if (res.statusCode === 301 || res.statusCode === 302) return get(res.headers.location);
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode} — ${u}`));
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
      }).on('error', reject);
    }
    get(url);
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    function get(u) {
      https.get(u, { headers: UA }, res => {
        if (res.statusCode === 301 || res.statusCode === 302) return get(res.headers.location);
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
        const file = createWriteStream(dest);
        res.pipe(file);
        file.on('finish', () => file.close(resolve));
        file.on('error', reject);
      }).on('error', reject);
    }
    get(url);
  });
}

// ── Check ─────────────────────────────────────────────────────────────────────
export async function checkForUpdates(channel) {
  try {
    if (channel === 'develop') {
      const data      = await fetchJson(`https://api.github.com/repos/${GITHUB_REPO}/commits/develop`);
      const latestSha = data.sha;
      const shortSha  = latestSha?.slice(0, 7);
      const current   = getCurrentSha();
      if (latestSha && shortSha !== current && latestSha !== current) {
        return {
          available: true, channel: 'develop',
          sha: latestSha, shortSha,
          label: `dev@${shortSha}`,
          tarballUrl: `https://api.github.com/repos/${GITHUB_REPO}/tarball/develop`,
        };
      }
      return { available: false };
    } else {
      const data = await fetchJson(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`);
      if (!data.tag_name) return { available: false };
      const latest = data.tag_name.replace(/^v/, '');
      if (semverGt(latest, getCurrentVersion())) {
        const zipAsset = data.assets?.find(a => a.name === 'movie-chain-windows.zip');
        return {
          available: true, channel: 'stable',
          version: latest, tag: data.tag_name,
          label: `v${latest}`,
          tarballUrl: data.tarball_url,
          windowsZipUrl: zipAsset?.browser_download_url ?? null,
        };
      }
      return { available: false };
    }
  } catch (e) {
    console.error('[updater] check error:', e.message);
    return { available: false, error: e.message };
  }
}

// ── Apply ─────────────────────────────────────────────────────────────────────
export async function applyUpdate(channel, broadcast) {
  const tmpDir = join(ROOT, '.update-tmp');
  try {
    setState({ phase: 'downloading' }, broadcast);
    const info = await checkForUpdates(channel);
    if (!info.available) { setState({ phase: 'idle' }, broadcast); return; }

    if (existsSync(tmpDir)) await rm(tmpDir, { recursive: true });
    mkdirSync(tmpDir, { recursive: true });

    let junctionPath = null; // tracked so cleanup can remove it without following it

    if (IS_INSTALLER) {
      // ── Installer path: download pre-built zip, extract with PowerShell ──────
      if (!info.windowsZipUrl) throw new Error('No Windows update package found for this release.');
      const zipPath       = join(tmpDir, 'update.zip');
      const extractedDir  = join(tmpDir, 'extracted');

      await downloadFile(info.windowsZipUrl, zipPath);

      setState({ phase: 'extracting' }, broadcast);
      execSync(
        `powershell -Command "Expand-Archive -LiteralPath '${zipPath}' -DestinationPath '${extractedDir}' -Force"`,
        { stdio: ['ignore', 'pipe', 'pipe'] }
      );

      setState({ phase: 'applying' }, broadcast);
      for (const item of ['dist', 'server', 'node_modules']) {
        const dest = join(ROOT, item);
        if (existsSync(dest)) await rm(dest, { recursive: true });
        await cp(join(extractedDir, item), dest, { recursive: true });
      }
      await cp(join(extractedDir, 'package.json'), join(ROOT, 'package.json'));
    } else {
      // ── Source/Docker path: download tarball, build from source ──────────────
      await downloadFile(info.tarballUrl, join(tmpDir, 'update.tar.gz'));

      setState({ phase: 'extracting' }, broadcast);
      execSync('tar -xzf update.tar.gz', { cwd: tmpDir });
      const dirs = readdirSync(tmpDir).filter(e => e !== 'update.tar.gz');
      if (!dirs.length) throw new Error('Extraction produced no directory');
      const srcDir = join(tmpDir, dirs[0]);

      setState({ phase: 'installing' }, broadcast);

      // Reuse existing node_modules when dependencies haven't changed — avoids
      // a full npm ci (network + disk) on the majority of updates.
      const newPkg = JSON.parse(await readFile(join(srcDir, 'package.json'), 'utf-8'));
      const oldPkg = (() => {
        try { return JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8')); }
        catch { return {}; }
      })();
      const depsHash = p => JSON.stringify([p.dependencies || {}, p.devDependencies || {}]);
      const canReuseModules =
        depsHash(newPkg) === depsHash(oldPkg) && existsSync(join(ROOT, 'node_modules'));

      if (canReuseModules) {
        // Junction on Windows, symlink on Linux — instant, no file copying needed
        const linkType = process.platform === 'win32' ? 'junction' : 'dir';
        junctionPath = join(srcDir, 'node_modules');
        symlinkSync(join(ROOT, 'node_modules'), junctionPath, linkType);
      } else {
        execSync('npm ci', { cwd: srcDir, stdio: ['ignore', 'pipe', 'pipe'] });
      }

      setState({ phase: 'building' }, broadcast);
      execSync('npm run build', {
        cwd: srcDir,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, NODE_ENV: 'production' },
      });

      setState({ phase: 'applying' }, broadcast);

      const distDest = join(ROOT, 'dist');
      if (existsSync(distDest)) await rm(distDest, { recursive: true });
      await cp(join(srcDir, 'dist'), distDest, { recursive: true });

      const serverDest = join(ROOT, 'server');
      if (existsSync(serverDest)) await rm(serverDest, { recursive: true });
      await cp(join(srcDir, 'server'), serverDest, { recursive: true });

      await cp(join(srcDir, 'package.json'), join(ROOT, 'package.json'));
    }

    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    await writeFile(CURRENT_PATH, JSON.stringify({
      version: info.version || getCurrentVersion(),
      sha:     info.shortSha || info.sha || getCurrentSha(),
      updatedAt: new Date().toISOString(),
    }));

    if (junctionPath && existsSync(junctionPath)) rmSync(junctionPath);
    await rm(tmpDir, { recursive: true });

    setState({ phase: 'restarting' }, broadcast);
    console.log('[updater] Update applied — restarting in 1.5s');
    setTimeout(() => process.exit(0), 1500);
  } catch (e) {
    console.error('[updater] apply error:', e.message);
    try {
      if (junctionPath && existsSync(junctionPath)) rmSync(junctionPath);
      if (existsSync(tmpDir)) await rm(tmpDir, { recursive: true });
    } catch {}
    setState({ phase: 'error', error: e.message }, broadcast);
  }
}

// ── Background checker ────────────────────────────────────────────────────────
export function startChecker(broadcast) {
  async function tick() {
    try {
      const cfg = await readConfig();
      if (state.phase === 'idle') {
        const result = await checkForUpdates(cfg.updateChannel);
        if (result.available) setState({ phase: 'available', ...result }, broadcast);
      }
    } catch (e) {
      console.error('[updater] scheduler error:', e.message);
    }
    const cfg = await readConfig().catch(() => DEFAULT_CONFIG);
    setTimeout(tick, (cfg.checkIntervalHours || 1) * 60 * 60 * 1000);
  }
  setTimeout(tick, 30_000); // first check 30s after startup
}
