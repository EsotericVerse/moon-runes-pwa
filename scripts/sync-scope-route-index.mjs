// Backward-compatible explicit sync command.
// Routes and public Config now share one JS module, so their snapshots are
// published together with Blocks, bootstrap metadata and Theme CSS.
import './generate-public-blocks.mjs';
