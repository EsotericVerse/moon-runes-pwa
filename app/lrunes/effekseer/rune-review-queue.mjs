/** Seven effects rejected by the owner. This queue retains X until visually accepted. */
export const RUNE_VFX_REVIEW_QUEUE=Object.freeze([["Mirror","鏡"],["Root","根"],["Branch","枝"],["Jade","玉"],["Crystal","晶"],["Diamond","鑽"],["Dust","塵"]]);
export const RUNE_VFX_REVIEW_NAMES=Object.freeze(RUNE_VFX_REVIEW_QUEUE.map(([name])=>name));
export const RUNE_VFX_REVIEW_STATUS=Object.freeze(Object.fromEntries(RUNE_VFX_REVIEW_NAMES.map(name=>[name,'rejected'])));
