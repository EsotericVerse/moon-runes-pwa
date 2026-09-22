// Writing rows are loaded from Neon by the Current runtime.
export const writingWorks=Object.freeze([]);
export function getWritingWork(){return null;}
export function publicSourceRefs(work){return(work?.source_refs||[]).filter(ref=>typeof ref?.url==='string'&&/^https?:\/\//i.test(ref.url));}
