import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {estimateImportStageMinutes} from '../app/loc/import-batch.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('only estimate a measurable stage, not all import phases',()=>{
  assert.equal(estimateImportStageMinutes({completed:0,total:100,elapsedMs:9000}),null);
  assert.equal(estimateImportStageMinutes({completed:10,total:100,elapsedMs:1000}),null);
  assert.equal(estimateImportStageMinutes({completed:5,total:100,elapsedMs:4000}),null);
  assert.deepEqual(estimateImportStageMinutes({completed:50,total:100,elapsedMs:30000}),{underMinute:true,minutes:1});
  assert.deepEqual(estimateImportStageMinutes({completed:20,total:100,elapsedMs:60000}),{underMinute:false,minutes:4});
  assert.equal(estimateImportStageMinutes({completed:100,total:100,elapsedMs:8000}),null);
});

test('import screen prioritizes file and write controls, not repair tools',()=>{
  const panel=read('app/loc/ManagementImportPanel.jsx');
  assert.ok(panel.lastIndexOf('<UniversalImport scopeId={scopeId}')<panel.lastIndexOf('<ScopeSourceCorrection scopeId={scopeId}/>'));
  assert.match(panel,/className="scope-import-options-row"/);
  assert.match(panel,/scope-import-save-button/);
  assert.match(panel,/stageStartedAt:previous\?\.stage===stage/);
  assert.match(panel,/estimateImportStageMinutes/);
  assert.match(panel,/className="scope-import-maintenance"/);
  const styles=read('app/styles/features.css');
  assert.match(styles,/\.scope-import-options-row\{/);
  assert.match(styles,/\.scope-import-stage-estimate\{/);
});
