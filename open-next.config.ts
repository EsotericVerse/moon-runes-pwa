import {defineCloudflareConfig} from "@opennextjs/cloudflare";

// Keep the Cloudflare adapter explicit. ISR cache backends must be configured
// and verified before routing production traffic to this Worker.
export default defineCloudflareConfig();
