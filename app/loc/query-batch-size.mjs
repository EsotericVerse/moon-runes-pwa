// Canonical limit used by every LOC database transport (public and authenticated).
// Callers can request fewer rows; this ceiling must match the operator's MaxRows.
export const DB_QUERY_BATCH_SIZE=10000;

// Shared Timeline I/O sizes. SQL RPC caps must mirror these values.
export const TIMELINE_IO=Object.freeze({windowBatch:100,previewPage:3000,writeBatch:500});
