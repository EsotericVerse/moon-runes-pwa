// Canonical limit used by every LOC database transport (public and authenticated).
// Callers can request fewer rows; this ceiling must match the operator's MaxRows.
export const DB_QUERY_BATCH_SIZE=65535;
