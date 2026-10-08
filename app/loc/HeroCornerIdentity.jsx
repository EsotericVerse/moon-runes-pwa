/* Fixed Scope identities for homepage Heros, separate from image/theme data.
   One accessible mark per Hero; no additional layout wrapper or external asset. */
export default function HeroCornerIdentity({scopeId}){
  if(scopeId==='loc'){
    return <span className="home-hero-identity home-hero-identity--codex" role="img" aria-label="Codex X">X</span>;
  }
  if(scopeId==='lo3rwang'){
    return <span className="home-hero-identity home-hero-identity--anchor" role="img" aria-label="光之定錨點">光之定錨點</span>;
  }
  if(scopeId==='lrunes'){
    return <span className="home-hero-identity home-hero-identity--moon" role="img" aria-label="玄韻家黃色圓點標誌"/>;
  }
  return null;
}
