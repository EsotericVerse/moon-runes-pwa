import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';

// Local, zero-cost safety net: refuse to push a commit that deletes or
// renames a large number of files without explicit confirmation. This
// exists because a commit can look "clean" (no syntax errors, builds
// fine) while still being a mass-deletion that was never confirmed with
// the user — see AGENTS.md §溝通節奏, stop-condition 4/5.
//
// Enable once per clone: git config core.hooksPath .githooks
//
// Threshold and override are deliberately simple: count D/R status lines
// per commit; a commit over the threshold is blocked unless its message
// contains the override tag.

const THRESHOLD = 20;
const OVERRIDE_TAG = '[bulk-delete-ok]';

function sh(args) {
  return execFileSync('git', args, {encoding: 'utf8'}).trim();
}

function commitsToPush() {
  // Reads "<local ref> <local sha> <remote ref> <remote sha>" lines from
  // stdin, as git feeds a pre-push hook. Falls back to HEAD vs its
  // upstream when run manually (no stdin / not a real push).
  let input = '';
  try {
    input = readFileSync(0, 'utf8');
  } catch {}
  const lines = input.split('\n').map((l) => l.trim()).filter(Boolean);
  if (!lines.length) {
    try {
      const upstream = sh(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']);
      return sh(['rev-list', `${upstream}..HEAD`]).split('\n').filter(Boolean);
    } catch {
      return [];
    }
  }
  const shas = new Set();
  for (const line of lines) {
    const [, localSha, , remoteSha] = line.split(/\s+/);
    if (!localSha || /^0+$/.test(localSha)) continue;
    const range = remoteSha && !/^0+$/.test(remoteSha) ? `${remoteSha}..${localSha}` : localSha;
    try {
      for (const c of sh(['rev-list', range]).split('\n').filter(Boolean)) shas.add(c);
    } catch {
      shas.add(localSha);
    }
  }
  return [...shas];
}

let blocked = false;
for (const sha of commitsToPush()) {
  const status = sh(['show', '--format=', '--name-status', sha]);
  const touched = status.split('\n').filter((l) => /^[DR]/.test(l));
  if (touched.length <= THRESHOLD) continue;

  const message = sh(['log', '-1', '--format=%B', sha]);
  if (message.includes(OVERRIDE_TAG)) {
    console.log(`check-bulk-delete: ${sha.slice(0, 7)} touches ${touched.length} D/R files, has ${OVERRIDE_TAG}, allowed.`);
    continue;
  }

  blocked = true;
  console.error(`\nBLOCKED: commit ${sha.slice(0, 7)} deletes/renames ${touched.length} files (threshold: ${THRESHOLD}).`);
  console.error(`  "${message.split('\n')[0]}"`);
  console.error(`  AGENTS.md 溝通節奏 stop-condition 4: this scale of deletion must be confirmed with the user before pushing.`);
  console.error(`  If the user has already confirmed this, add "${OVERRIDE_TAG}" to the commit message and push again.\n`);
}

if (blocked) process.exitCode = 1;
else console.log('check-bulk-delete: no oversized D/R commit found.');
