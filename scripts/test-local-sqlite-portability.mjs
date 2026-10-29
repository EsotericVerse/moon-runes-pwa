import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../app/loc/providers/local-sqlite.mjs',import.meta.url),'utf8');

test('local SQLite routes totals-only Culture RPC to a local aggregate',()=>{
  assert.match(source,/case 'read_scope_category_totals':return readScopeCategoryTotalsLocal\(args\)/);
  assert.match(source,/async function readScopeCategoryTotalsLocal/);
  assert.match(source,/statistics_able=1 AND content<>''/);
  assert.match(source,/FROM local_galaxy_media/);
});

test('SQLite treats UID as case-sensitive and does not rewrite imported identities',()=>{
  assert.match(source,/WHERE eligible\.value=local_galaxy\.uid/);
  assert.doesNotMatch(source,/upper\(trim\(eligible\.value\)\)/i);
  assert.match(source,/if\(\/\^\[A-Za-z0-9\]\{8\}\$\/\.test\(raw\)\)return raw/);
  assert.match(source,/\(id&&!\/\^\[A-Za-z0-9\]\{8\}\$\/\.test\(id\)\)/);
});
