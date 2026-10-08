'use client';

import {useEffect,useMemo,useRef,useState} from 'react';

function buildGraph(items=[],className='',classId='',expandedGroup='',expandedItemId=''){
  const rows=Array.isArray(items)?items:[];
  const nodes=[];
  const edges=[];
  const meta=new Map();
  const rootId='class:'+String(classId||className||'current');
  nodes.push({id:rootId,label:className||'Keyword Class',level:0,kind:'class',shape:'ellipse'});
  meta.set(rootId,{kind:'class',className,classId});

  const groups=[...new Set(rows.map(row=>String(row.class_group||'').trim()).filter(Boolean))];
  groups.forEach((group,index)=>{
    const id='group:'+group;
    nodes.push({id,label:group,level:1,kind:'group',shape:'box'});
    edges.push({id:rootId+'>'+id,from:rootId,to:id});
    meta.set(id,{kind:'group',group});
  });

  // Expand only one Group and one Item at a time; drawing all Keywords at once
  // produces a very large horizontal graph and an unusable canvas.
  rows.filter(row=>String(row.class_group||'').trim()===expandedGroup).forEach((row,rowIndex)=>{
    const itemId='item:'+String(row.keyword_id||rowIndex);
    const group=String(row.class_group||'').trim();
    const groupId='group:'+group;
    nodes.push({
      id:itemId,
      label:String(row.item_no||rowIndex+1)+' · '+String(row.item_name||'未命名'),
      level:2,
      kind:'item',
      shape:'box',
      title:String(row.principle||'')
    });
    edges.push({id:groupId+'>'+itemId,from:groupId,to:itemId});
    meta.set(itemId,{kind:'item',row});
    if(String(row.keyword_id||'')===expandedItemId)(Array.isArray(row.keywords)?row.keywords:[]).forEach((keyword,index)=>{
      const text=String(keyword||'').trim();
      if(!text)return;
      const id='keyword:'+String(row.keyword_id||rowIndex)+':'+index;
      nodes.push({id,label:text,level:3,kind:'keyword',shape:'text'});
      edges.push({id:itemId+'>'+id,from:itemId,to:id});
      meta.set(id,{kind:'keyword',row,keyword:text});
    });
  });
  return {nodes,edges,meta,rootId};
}

export default function KeywordNetworkEditor({
  items=[],
  className='',
  classId='',
  selectedId='',
  onSelectItem=null,
  onNewItem=null,
  onDeleteItem=null,
  onDeleteKeyword=null,
  onDeleteGroup=null,
  onMessage=null
}){
  const containerRef=useRef(null);
  const networkRef=useRef(null);
  const selectedNodeRef=useRef('');
  const [expandedGroup,setExpandedGroup]=useState('');
  const [expandedItemId,setExpandedItemId]=useState('');
  const handlersRef=useRef({onSelectItem,onNewItem,onDeleteItem,onDeleteKeyword,onDeleteGroup,onMessage});
  const [error,setError]=useState('');
  const graph=useMemo(()=>buildGraph(items,className,classId,expandedGroup,expandedItemId),[items,className,classId,expandedGroup,expandedItemId]);
  useEffect(()=>{
    const row=items.find(item=>String(item.keyword_id)===String(selectedId));
    if(row){
      setExpandedGroup(String(row.class_group||''));
      setExpandedItemId(String(row.keyword_id||''));
    }
  },[selectedId,items]);

  useEffect(()=>{handlersRef.current={onSelectItem,onNewItem,onDeleteItem,onDeleteKeyword,onDeleteGroup,onMessage}},[onSelectItem,onNewItem,onDeleteItem,onDeleteKeyword,onDeleteGroup,onMessage]);

  useEffect(()=>{
    let cancelled=false;
    let network=null;
    setError('');
    if(!containerRef.current||!graph.nodes.length)return undefined;
    import('vis-network/standalone').then(({Network})=>{
      if(cancelled||!containerRef.current)return;
      const styles=getComputedStyle(containerRef.current);
      const text=styles.getPropertyValue('--loc-text').trim()||'#dfe8f2';
      const muted=styles.getPropertyValue('--loc-muted').trim()||'#9ca8b5';
      const accent=styles.getPropertyValue('--loc-accent').trim()||'#7c9bbd';
      const panel=styles.getPropertyValue('--loc-panel-2').trim()||'#162536';
      const line=styles.getPropertyValue('--loc-line').trim()||'#526272';
      const nodes=graph.nodes.map(node=>({
        ...node,
        borderWidth:node.kind==='class'?3:node.kind==='group'?2:1,
        margin:node.kind==='keyword'?2:8,
        color:{background:panel,border:node.kind==='class'?accent:line,highlight:{background:panel,border:accent}},
        font:{color:node.kind==='keyword'?muted:text,size:node.kind==='class'?16:node.kind==='group'?14:12,face:'inherit'},
        widthConstraint:node.kind==='keyword'?{maximum:150}:{maximum:220}
      }));
      const edges=graph.edges.map(edge=>({...edge,color:{color:line,highlight:accent,hover:accent},arrows:'to',smooth:{type:'cubicBezier',forceDirection:'horizontal',roundness:.35}}));
      const metaOf=id=>graph.meta.get(String(id||''))||null;
      const selectMeta=meta=>{
        if(!meta)return;
        if(meta.kind==='item'||meta.kind==='keyword')handlersRef.current.onSelectItem?.(meta.row);
      };

      network=new Network(containerRef.current,{nodes,edges},{
        autoResize:true,
        physics:false,
        // vis-network manipulation uses 'en' as its fallback locale.
        // Replacing the locale map with only 'zh-tw' left fallback undefined
        // and crashed while reading the manipulation toolbar 'close' label.
        locale:'en',
        locales:{en:{
          edit:'編輯',del:'刪除所選',back:'返回',close:'關閉',addNode:'新增節點',addEdge:'新增關係',
          editNode:'編輯節點',editEdge:'編輯關係',addDescription:'點圖面放置新節點。',
          edgeDescription:'拖曳建立關係。',editEdgeDescription:'拖曳調整關係。',
          createEdgeError:'無法建立此關係。',deleteClusterError:'無法刪除群集。',editClusterError:'無法編輯群集。'
        }},
        layout:{hierarchical:{enabled:true,direction:'LR',sortMethod:'directed',levelSeparation:190,nodeSpacing:110,treeSpacing:170}},
        interaction:{hover:true,navigationButtons:true,keyboard:true,dragNodes:true,dragView:true,zoomView:true},
        manipulation:{
          enabled:true,
          initiallyActive:true,
          addEdge:false,
          editEdge:false,
          addNode:(nodeData,callback)=>{
            const selected=metaOf(selectedNodeRef.current);
            const group=selected?.kind==='group'
              ?selected.group
              :(selected?.kind==='item'||selected?.kind==='keyword')?String(selected.row?.class_group||''):'';
            handlersRef.current.onNewItem?.(group);
            callback(null);
          },
          editNode:(nodeData,callback)=>{
            const meta=metaOf(nodeData?.id);
            selectMeta(meta);
            if(meta?.kind==='class'||meta?.kind==='group')handlersRef.current.onMessage?.('Class／Group 由圖上的分類項目構成；選取項目後編輯其資料。');
            callback(null);
          },
          deleteNode:(selection,callback)=>{
            const ids=Array.isArray(selection?.nodes)?selection.nodes:[];
            const metas=ids.map(metaOf).filter(Boolean);
            Promise.all(metas.map(meta=>{
              if(meta.kind==='keyword')return handlersRef.current.onDeleteKeyword?.(meta.row,meta.keyword);
              if(meta.kind==='item')return handlersRef.current.onDeleteItem?.(meta.row);
              if(meta.kind==='group')return handlersRef.current.onDeleteGroup?.(meta.group);
              handlersRef.current.onMessage?.('Class 本身以 UUID 管理，不從圖上直接刪除。');
              return false;
            })).then(results=>{
              if(results.every(Boolean))callback(selection);
              else callback(null);
            }).catch(()=>callback(null));
          }
        },
        nodes:{chosen:true},
        edges:{selectionWidth:2,hoverWidth:1.5}
      });
      networkRef.current=network;
      network.fit({animation:false});
      network.on('selectNode',event=>{
        const id=String(event.nodes?.[0]||'');
        selectedNodeRef.current=id;
        const meta=metaOf(id);
        if(meta?.kind==='group'){
          setExpandedGroup(meta.group);
          setExpandedItemId('');
        }else if(meta?.kind==='item'){
          setExpandedGroup(String(meta.row?.class_group||''));
          setExpandedItemId(String(meta.row?.keyword_id||''));
        }
        selectMeta(meta);
      });
      network.on('deselectNode',()=>{selectedNodeRef.current='';});
      network.on('doubleClick',event=>{
        const id=String(event.nodes?.[0]||'');
        if(!id)return;
        selectedNodeRef.current=id;
        network.selectNodes([id]);
        network.editNode();
      });

      if(selectedId){
        const itemNode='item:'+String(selectedId);
        if(graph.meta.has(itemNode)){
          selectedNodeRef.current=itemNode;
          network.selectNodes([itemNode]);
          network.focus(itemNode,{scale:1.05,animation:false});
        }
      }
    }).catch(reason=>{if(!cancelled)setError(reason?.message||'vis-network 載入失敗。');});
    return()=>{cancelled=true;if(networkRef.current===network)networkRef.current=null;network?.destroy();};
  },[graph]);
  useEffect(()=>{
    const itemNode='item:'+String(selectedId||'');
    if(selectedId&&graph.meta.has(itemNode)&&networkRef.current){
      networkRef.current.selectNodes([itemNode]);
    }
  },[selectedId,graph]);

  return <section className="scope-keyword-network" aria-label="關鍵詞階層圖">
    <div className="scope-keyword-network-help">
      <strong>Class → Group → Item → Keyword</strong>
      <span>先選 Group 展開符文 Item，再點 Item 展開關鍵詞；可拖曳與縮放畫布，雙擊或使用工具列編輯。</span>
    </div>
    {error?<p className="scope-status scope-error">{error}</p>:null}
    <div ref={containerRef} className="scope-graph-canvas scope-keyword-network-canvas" role="application" aria-label={className+' 關鍵詞 vis-network 編輯器'}/>
  </section>;
}
