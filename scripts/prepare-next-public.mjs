import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const root = process.cwd();
const copies = [
  ['data/json', 'public/data/json'],
  ['docs', 'public/docs'],
  ['pics', 'public/pics']
];

for (const [sourceRel, targetRel] of copies) {
  const source = resolve(root, sourceRel);
  const target = resolve(root, targetRel);
  if (!existsSync(source)) continue;
  rmSync(target, { recursive: true, force: true });
  mkdirSync(dirname(target), { recursive: true });
  cpSync(source, target, { recursive: true });
  console.log(`[next-public] ${sourceRel} -> ${targetRel}`);
}
