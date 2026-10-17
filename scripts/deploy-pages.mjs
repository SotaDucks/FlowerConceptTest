// Build and publish dist/ to the gh-pages branch of origin (GitHub Pages).
// Usage: npm run deploy
import { execSync } from 'node:child_process';
import { mkdtempSync, cpSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const run = (cmd, cwd) => execSync(cmd, { cwd, stdio: 'inherit' });
const out = (cmd) => execSync(cmd).toString().trim();

const remote = out('git remote get-url origin');
const sha = out('git rev-parse --short HEAD');
run('npx vite build');

const dir = mkdtempSync(join(tmpdir(), 'nr-pages-'));
try {
  cpSync('dist', dir, { recursive: true });
  writeFileSync(join(dir, '.nojekyll'), '');
  run('git init -q -b gh-pages', dir);
  run('git add -A', dir);
  run(`git commit -q -m "Deploy ${sha}"`, dir);
  run(`git push -f "${remote}" gh-pages`, dir);
} finally {
  rmSync(dir, { recursive: true, force: true });
}

const m = remote.match(/github\.com[/:]([^/]+)\/(.+?)(\.git)?$/);
if (m) console.log(`\nPublished: https://${m[1].toLowerCase()}.github.io/${m[2]}/`);
