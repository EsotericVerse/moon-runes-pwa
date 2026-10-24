// Snapshot of the PUBLIC routing columns in silver.loc (read once).
// Do not include email, permissions, tokens, or other management data here.
// Regenerate explicitly after an authorized Domain/Directory edit;
// ordinary visits and static builds NEVER query the database for routing.
export const SCOPE_ROUTE_INDEX=Object.freeze([
  Object.freeze({scope_id:'lo3rwang',domain:null,directory:'/lo3rwang',active:true}),
  Object.freeze({scope_id:'loc',domain:'loc.lo3rwang.cc',directory:null,active:true}),
  Object.freeze({scope_id:'lrunes',domain:'lrunes.lo3rwang.cc',directory:null,active:true})
]);
