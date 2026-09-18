import grammar from '../../data/json/core/rune_grammar.json';
const spreadKeyByMode={single:'single',daily:'daily','2card':'dual','3card':'triple','5card':'five',ow3gs:'ow3gs'};
export const RUNE_GRAMMAR=grammar;
export const RUNE_DRAW_MODES=Object.entries(spreadKeyByMode).map(([key,spreadKey])=>{const spread=grammar.spreads[spreadKey];return {key,count:spread.count,label:spread.label,positions:spread.positions.map(position=>position.label),spreadKey};});
export function runeSpread(mode){return grammar.spreads[spreadKeyByMode[mode]||'single'];}
