'use client';

import {useEffect,useMemo,useRef,useState} from 'react';

const DEFAULT_KEYWORD_GROUPS=Object.freeze([['positive','正向關鍵詞'],['negative','反向關鍵詞'],['rules','規則']]);

function networkData(groups,keywordGroups,entityLabel){
  const source=Array.isArray(groups)?groups:[];
  const nodes=[];
  const edges=[];
  const entityCount=Math.max(1,source.length);
  const entityRadius=Math.max(360,entityCount*12);
  const layerGap=Math.max(180,Math.min(280,entityCount*3.5));

  source.forEach((entity,entityIndex)=>{
    const angle=(Math.PI*2*entityIndex/entityCount)-(Math.PI/2);
    const styleNo=Number(entity.style_no);
    const entityId='entity:'+styleNo;
    const entityName=entity.representative_name||entityLabel+' '+styleNo;
    nodes.push({
      id:entityId,
      type:'entity',
      styleNo,
      label:entityName,
      detail:entity.basic_principle||entityLabel,
      x:Math.cos(angle)*entityRadius,
      y:Math.sin(angle)*entityRadius
    });

    keywordGroups.forEach(([key,label],layerIndex)=>{
      const rows=(Array.isArray(entity.keywords)?entity.keywords:[]).filter(row=>row.keyword_group===key);
      const radius=entityRadius+layerGap*(layerIndex+1);
      const spread=Math.min(Math.PI/14,Math.PI/Math.max(entityCount*1.8,24));
      const start=angle-spread*(Math.max(0,rows.length-1)/2);
      rows.forEach((row,index)=>{
        const childAngle=start+spread*index;
        const keywordId='keyword:'+styleNo+':'+key+':'+index+':'+row.keyword;
        nodes.push({
          id:keywordId,
          type:'keyword',
          styleNo,
          keywordGroup:key,
          keyword:row.keyword,
          label:row.keyword,
          detail:entityName+' · '+label,
          x:Math.cos(childAngle)*radius,
          y:Math.sin(childAngle)*radius
        });
        edges.push({
          id:entityId+'->'+keywordId,
          from:entityId,
          to:keywordId,
          keywordGroup:key
        });
      });
    });
  });

  return {nodes,edges};
}

export default function KeywordGraph2DV2({
  groups=[],
  onSelect,
  keywordGroups=DEFAULT_KEYWORD_GROUPS,
  entityLabel='符文',
  title='符文關鍵詞圓形圖',
  description='符文排列在內圈，關鍵詞依正向、反向與規則向外展開。可拖曳、縮放，點選任一節點開啟對應符文。'
}){
  const containerRef=useRef(null);
  const networkRef=useRef(null);
  const onSelectRef=useRef(onSelect);
  const [selected,setSelected]=useState(null);
  const [error,setError]=useState('');
  const graph=useMemo(()=>networkData(groups,keywordGroups,entityLabel),[groups,keywordGroups,entityLabel]);
  onSelectRef.current=onSelect;

  useEffect(()=>{
    let cancelled=false;
    let network=null;
    setError('');
    if(!containerRef.current||!graph.nodes.length)return undefined;

    import('vis-network/standalone').then(({Network})=>{
      if(cancelled||!containerRef.current)return;
      const styles=getComputedStyle(containerRef.current);
      const text=styles.getPropertyValue('--loc-text').trim()||'#dfe8f2';
      const accent=styles.getPropertyValue('--loc-accent').trim()||'#7c9bbd';
      const panel=styles.getPropertyValue('--loc-panel-2').trim()||'#162536';
      const line=styles.getPropertyValue('--loc-line').trim()||'#526272';

      const nodes=graph.nodes.map(node=>({
        ...node,
        shape:node.type==='entity'?'dot':'box',
        size:node.type==='entity'?18:10,
        margin:node.type==='entity'?8:5,
        borderWidth:node.type==='entity'?2:1,
        color:{background:panel,border:accent,highlight:{background:panel,border:accent}},
        font:{color:text,size:node.type==='entity'?14:11,face:'inherit'},
        title:node.label+'\n'+node.detail
      }));
      const edges=graph.edges.map(edge=>({
        ...edge,
        width:1,
        color:{color:line,highlight:accent,hover:accent},
        smooth:{enabled:true,type:'continuous',roundness:.08}
      }));

      network=new Network(containerRef.current,{nodes,edges},{
        autoResize:true,
        physics:{enabled:false},
        interaction:{hover:true,navigationButtons:true,keyboard:true,dragNodes:true,dragView:true,zoomView:true},
        nodes:{chosen:true},
        edges:{selectionWidth:2,hoverWidth:1.5}
      });
      network.fit({animation:{duration:250,easingFunction:'easeInOutQuad'}});

      network.on('selectNode',event=>{
        const id=String(event.nodes?.[0]||'');
        const node=graph.nodes.find(item=>item.id===id)||null;
        setSelected(node);
        if(node)onSelectRef.current?.(node);
      });

      networkRef.current=network;
    }).catch(reason=>{if(!cancelled)setError(reason?.message||'vis-network 載入失敗');});

    return()=>{
      cancelled=true;
      network?.destroy();
      networkRef.current=null;
    };
  },[graph]);

  return <section className="loc-keyword-graph2d" aria-label="關鍵詞圓形圖">
    <h3>{title}</h3>
    <p>{description}</p>
    {error?<p className="scope-v2-status scope-v2-error">{error}</p>:null}
    {graph.nodes.length
      ?<div ref={containerRef} className="loc-keyword-graph2d-canvas" role="img" aria-label={'關鍵詞圓形圖，'+graph.nodes.length+' 個節點'}/>
      :<p className="scope-v2-status">沒有可顯示的關鍵詞。</p>}
    {selected?<p className="scope-v2-meta" aria-live="polite">選取：{selected.label}｜{selected.detail}</p>:null}
  </section>;
}
