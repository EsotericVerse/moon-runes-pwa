// Shared interaction guard for homepage Blocks and Search/Culture articles.
// Interactive visualisations and native controls must retain their own clicks;
// only non-interactive text/card areas can enter the existing BlockNote editor.
const INTERACTIVE_CONTENT_SELECTOR=[
  'a','button','input','select','textarea','summary',
  '[role="button"]','[role="link"]','[role="tab"]','[role="slider"]',
  '[role="checkbox"]','[role="switch"]','[contenteditable="true"]',
  '[data-no-inline-edit]','[data-chart-interactive]',
  '.recharts-wrapper','.recharts-responsive-container',
  '.vis-timeline','.vis-network','.vis-item',
  'svg','canvas','iframe','video','audio'
].join(',');

export function isInteractiveContentTarget(target){
  return Boolean(target?.closest?.(INTERACTIVE_CONTENT_SELECTOR));
}
