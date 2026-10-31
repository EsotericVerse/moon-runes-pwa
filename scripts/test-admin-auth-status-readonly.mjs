import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {readonlyAuthStatus,recoveryOAuthLabel} from '../app/loc/providers/auth-status-readonly.mjs';

test('Database OAuth source follows existing primary route, not selected UI row',()=>{
  const defaultStatus=readonlyAuthStatus();
  assert.equal(defaultStatus.primaryOAuth,'Supabase Auth');
  assert.equal(defaultStatus.supabaseSupported,true);
  assert.equal(defaultStatus.neonSupported,false);
  assert.equal(readonlyAuthStatus({identityProvider:'clerk'}).primaryOAuth,'Clerk');
  assert.equal(readonlyAuthStatus({identityProvider:'clerk',primaryId:'neon-current'}).primaryOAuth,'Clerk');
  assert.equal(readonlyAuthStatus({identityProvider:'unsupported'}).primaryOAuth,'Supabase Auth');
  const neon=readonlyAuthStatus({primaryId:'neon-current',
    neonAuthUrl:'https://ep-example.neonauth.c-4.ap-southeast-1.aws.neon.tech/neondb/auth',
    neonDataApiUrl:'https://ep-example.apirest.c-4.ap-southeast-1.aws.neon.tech/neondb/rest/v1'});
  assert.equal(neon.primaryOAuth,'Neon Auth');
  assert.equal(neon.neonSupported,true);
});

test('auth support lights indicate configuration, never probe external services',()=>{
  assert.equal(readonlyAuthStatus({neonAuthUrl:'https://example.com/neondb/auth'}).neonSupported,false);
  assert.equal(readonlyAuthStatus({neonAuthUrl:'http://example.com/neondb/auth',
    neonDataApiUrl:'https://example.com/neondb/rest/v1'}).neonSupported,false);
  assert.equal(readonlyAuthStatus({neonAuthUrl:'https://example.com/neondb/auth',
    neonDataApiUrl:'https://example.com/neondb/rest/v1'}).neonSupported,true);
});

test('recovery OAuth is clearly separate from ordinary database Auth',()=>{
  assert.equal(recoveryOAuthLabel({}), '未設定');
  assert.equal(recoveryOAuthLabel({publishableKey:'pk_test_abc',
    frontendApiUrl:'https://example.clerk.accounts.dev'}),'Clerk（Development，獨立復原）');
  assert.equal(recoveryOAuthLabel({publishableKey:'pk_live_abc',
    frontendApiUrl:'https://accounts.example.org'}),'Clerk（Production，獨立復原）');
});

test('Admin OAuth status block is display-only and never rewrites database Link',()=>{
  const panel=readFileSync(new URL('../app/loc/views/admin-panels/DatabaseTarget.jsx',import.meta.url),'utf8');
  const start=panel.indexOf('{/* Authentication status: display only');
  const stop=panel.indexOf('<h3><UiText id="uiExtra.adminView.savedDatabaseConnections"',start);
  assert.ok(start>=0&&stop>start);
  const section=panel.slice(start,stop);
  assert.match(section,/OAuth 來源（唯讀）/);
  assert.match(section,/Supabase Auth/);
  assert.match(section,/Neon Auth/);
  assert.match(section,/recoveryOAuth/);
  assert.doesNotMatch(section,/onClick|onChange|<input|<select|password|secret/i);
  assert.match(panel,/onChange=\{event=>patch\('project_url',event.target.value\)\}/);
});
