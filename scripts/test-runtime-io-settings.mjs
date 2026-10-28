import assert from 'node:assert/strict';
import {test} from 'node:test';
import {applyRuntimeIoLimits,IO_LIMIT_CEILINGS} from '../app/loc/query-batch-size.mjs';
import * as limits from '../app/loc/query-batch-size.mjs';

test('runtime I/O settings apply across live exported limits and reject unsafe values',()=>{
  try {
    const saved=applyRuntimeIoLimits({maxRows:500,archiveMiB:128,jsonMiB:12});
    assert.equal(saved.maxRows,500);
    assert.equal(limits.MAX_ROWS,500);
    assert.equal(limits.DB_QUERY_BATCH_SIZE,500);
    assert.equal(limits.TIMELINE_IO.writeBatch,500);
    assert.equal(limits.MAX_ARCHIVE_BYTES,128*1048576);
    assert.equal(limits.MAX_JSON_BYTES,12*1048576);
    assert.throws(()=>applyRuntimeIoLimits({maxRows:100,archiveMiB:IO_LIMIT_CEILINGS.archiveMiB+1}));
    assert.equal(limits.MAX_ROWS,500,'invalid settings must not partially apply');
  } finally {applyRuntimeIoLimits({});}
});
