// Public cache policy. Edit here and redeploy; no database row is read at runtime.
// mode: 'off' | 'cache' | 'isr'
// origin: selected public ISR origin (only used when mode === 'isr').
export const CACHE_POLICY={
  mode:'cache',
  origin:'',
  provider:'cloudflare',
  domains:[
    {id:'cloudflare',label:'Cloudflare',origin:'https://isr.lo3rwang.cc'},
    {id:'vercel',label:'Vercel',origin:'https://moon-runes-pwa.vercel.app'}
  ]
};
