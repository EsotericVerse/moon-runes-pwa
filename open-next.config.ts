import {defineCloudflareConfig} from '@opennextjs/cloudflare';
import staticAssetsIncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache';

// Read-only build assets: no R2, Durable Object queue, tag cache or ISR.
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache
});
