import { normalizeRune } from './game-engine';

// Storage boundary for Game. The browser must not depend on the canonical storage shape.
// Alpha fallback reads the legacy public projection; production should point this endpoint
// at a server-side PostgreSQL controlled projection and return only Game-safe fields.
export async function loadGameRunes(){
 const response=await fetch('/api/lrunes/game/runes',{cache:'no-store'});
 if(!response.ok)throw new Error('Game Rune projection unavailable.');
 const payload=await response.json();
 return (payload.runes||payload).map(normalizeRune);
}
