'use client';

import {Tree} from 'react-arborist';

function ScopeTreeNode({node,style,dragHandle}){
  const data=node.data||node;
  return <div ref={dragHandle} style={style} className="scope-tree-row">
    <span aria-hidden="true">{node.isOpen?'▾':'▸'}</span>
    <span>{data.label||data.name||data.id}</span>
    {data.scope_id||data.id?<code>{data.scope_id||data.id}</code>:null}
  </div>;
}

export default function ScopeTreeEditor({data=[],height=520,width='100%',onMove,onSelect}){
  return <Tree
    data={Array.isArray(data)?data:[]}
    width={width}
    height={height}
    rowHeight={42}
    openByDefault
    onMove={onMove}
    onSelect={onSelect}
  >
    {ScopeTreeNode}
  </Tree>;
}

