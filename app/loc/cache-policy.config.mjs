// Public cache policy. Edit here and redeploy; no database row is read at runtime.
// mode: 'off' | 'cache' | 'isr'
// origin: selected public ISR origin (only used when mode === 'isr').
export const CACHE_POLICY={
  mode:'cache',
  origin:'',
  provider:'cloudflare',
  // A provider without a configured origin stays selectable, but never sends
  // traffic to the retired Worker host. Enable ISR with an explicitly verified
  // origin and a separate reviewed deployment.
  domains:[
    {id:'cloudflare',label:'Cloudflare',origin:''},
    {id:'vercel',label:'Vercel',origin:'https://moon-runes-pwa.vercel.app'}
  ]
};
