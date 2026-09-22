// Runtime writing records are loaded from Neon. IDs are route metadata only.
export const WRITING_ROUTE_IDS=Object.freeze(['LOC4-BEFORE-AFTER-YOU','LOC4-GRAY-RELATIONSHIP','LOC4-MILK-PAPER-BOAT','LOC4-MMM-RELATIONSHIP','LOC4-MOON-SPEAKER','LOC4-ONE-DAY-LOVER','LOC4-PROPHET-PERSON','LOC4-PSEUDO-SINGLE','LOC4-READ-RECEIPT','LOC4-WRONG-PERSON']);
export const writingWorks=Object.freeze([]);
export function getWritingWork(){return null;}
export function publicSourceRefs(work){return(work?.source_refs||[]).filter(ref=>typeof ref?.url==='string'&&/^https?:\/\//i.test(ref.url));}
