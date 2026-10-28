// One versioned JS file for LOC I/O limits. No runtime database settings.
// The administrator views these values in System Management; users cannot edit them.
export const MAX_ROWS=10000;
export const DB_QUERY_BATCH_SIZE=MAX_ROWS;

// Byte limits share this file; file bytes and database rows are different units.
export const MAX_ARCHIVE_BYTES=1024*1024*1024;
export const MAX_JSON_BYTES=50*1024*1024;
export const MAX_TIMELINE_BYTES=200*1024*1024;

// Timeline windows, preview results and writes all use the same MaxRows.
export const TIMELINE_IO=Object.freeze({windowBatch:MAX_ROWS,previewPage:MAX_ROWS,writeBatch:MAX_ROWS});
