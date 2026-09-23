# Experimental Engine

engine/ contains research scripts only. It is not a website runtime and must not carry a second copy of Canon data.

The Next application reads canonical content from Neon through its runtime clients (with `app/loc/data.js` as the canonical loader). Experimental code may consume exported query results supplied by an explicit research workflow, but it must not recreate data/json, runtime snapshots, or projection files.

Experimental outputs remain analysis artifacts until they are explicitly governed and imported into the appropriate Neon canonical/link tables.
