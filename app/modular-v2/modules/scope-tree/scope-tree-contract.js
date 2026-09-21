// Scope Tree is a structural module. It owns validation rules, not authority.
// The server dispatcher must run the same checks before every write.

export const SCOPE_TREE_LIMITS_V2=Object.freeze({
  maxParentDepth:4,
  maxChildDepth:4,
  maxTotalDepth:8
});

export const SCOPE_TREE_RELATION_STATES_V2=Object.freeze([
  'pending',
  'approved',
  'rejected',
  'revoked'
]);

function nodeId(node){
  if(typeof node==='string'||typeof node==='number')return String(node).trim();
  return String(node?.id||node?.scope_id||'').trim();
}

export function buildScopeTreeIndex(rows=[]){
  const nodes=new Map();
  const children=new Map();
  for(const row of Array.isArray(rows)?rows:[]){
    const id=nodeId(row);
    if(!id)continue;
    nodes.set(id,{...row,id});
    const parent=String(row.parent_id||row.parent_scope_id||'').trim();
    if(parent){
      if(!children.has(parent))children.set(parent,[]);
      children.get(parent).push(id);
    }
  }
  return {nodes,children};
}

export function hasScopeTreeCycle(rows=[],candidate={}){
  const {nodes}=buildScopeTreeIndex(rows);
  const child=nodeId(candidate.child||candidate.child_id||candidate.scope_id);
  let parent=String(candidate.parent||candidate.parent_id||candidate.parent_scope_id||'').trim();
  const visited=new Set();
  while(parent){
    if(parent===child)return true;
    if(visited.has(parent))return true;
    visited.add(parent);
    parent=String(nodes.get(parent)?.parent_id||nodes.get(parent)?.parent_scope_id||'').trim();
  }
  return false;
}

export function scopeTreeDepths(rows=[],candidate={}){
  const {nodes}=buildScopeTreeIndex(rows);
  const child=nodeId(candidate.child||candidate.child_id||candidate.scope_id);
  const parent=String(candidate.parent||candidate.parent_id||candidate.parent_scope_id||'').trim();
  const parentDepth=ancestorDepth(nodes,parent);
  const childDepth=descendantDepth(nodes,child);
  return {parentDepth,childDepth,totalDepth:parentDepth+1+childDepth};
}

function ancestorDepth(nodes,id){
  let depth=0;
  let current=String(id||'');
  const visited=new Set();
  while(current&&nodes.has(current)&&!visited.has(current)){
    visited.add(current);
    depth+=1;
    current=String(nodes.get(current)?.parent_id||nodes.get(current)?.parent_scope_id||'');
  }
  return depth;
}

function descendantDepth(nodes,id){
  const children=new Map();
  for(const [nodeIdValue,node] of nodes){
    const parent=String(node.parent_id||node.parent_scope_id||'');
    if(parent){
      if(!children.has(parent))children.set(parent,[]);
      children.get(parent).push(nodeIdValue);
    }
  }
  function walk(current,visited){
    if(visited.has(current))return Number.POSITIVE_INFINITY;
    const next=new Set(visited).add(current);
    const childIds=children.get(current)||[];
    return childIds.length?1+Math.max(...childIds.map(child=>walk(child,next))):0;
  }
  return id&&nodes.has(id)?walk(id,new Set()):0;
}

export function validateScopeTreeMove(rows=[],candidate={}){
  const child=nodeId(candidate.child||candidate.child_id||candidate.scope_id);
  const parent=String(candidate.parent||candidate.parent_id||candidate.parent_scope_id||'').trim();
  if(!child) return {ok:false,reason:'child_required'};
  if(!parent) return {ok:false,reason:'parent_required'};
  if(child===parent)return {ok:false,reason:'self_relation'};
  if(hasScopeTreeCycle(rows,{child,parent}))return {ok:false,reason:'cycle'};
  const depths=scopeTreeDepths(rows,{child,parent});
  const limits=SCOPE_TREE_LIMITS_V2;
  if(depths.parentDepth>limits.maxParentDepth)return {ok:false,reason:'parent_depth_limit',depths,limits};
  if(depths.childDepth>limits.maxChildDepth)return {ok:false,reason:'child_depth_limit',depths,limits};
  if(depths.totalDepth>limits.maxTotalDepth)return {ok:false,reason:'total_depth_limit',depths,limits};
  return {ok:true,depths,limits};
}
