'use client';

import {useEffect,useMemo,useRef,useState} from 'react';

const DEFAULT_KEYWORD_GROUPS=Object.freeze([['macro','大風格關鍵詞'],['style','風格關鍵詞']]);

function graphPoints(groups,keywordGroups,entityLabel){
  const points=[];
  for(const [entityIndex,entity] of groups.entries()){
    const x=entityIndex+1;
    const entityName=entity.representative_name||entityLabel+' '+entity.style_no;
    points.push({id:'style:'+entity.style_no,type:'style',styleNo:Number(entity.style_no),x,y:0,z:0,label:entityName,
      detail:entity.basic_principle||entityLabel,group:String(entity.style_no)});
    for(const [groupIndex,[key,label]] of keywordGroups.entries()){
      const y=groupIndex+1;
      points.push({id:'group:'+entity.style_no+':'+key,type:'group',styleNo:Number(entity.style_no),keywordGroup:key,x,y,z:0,label,
        detail:entityName+' · '+label,group:String(entity.style_no)});
      (Array.isArray(entity.keywords)?entity.keywords:[]).filter(row=>row.keyword_group===key).forEach((row,index)=>points.push({
        id:'keyword:'+entity.style_no+':'+key+':'+row.keyword,type:'keyword',styleNo:Number(entity.style_no),keywordGroup:key,keyword:row.keyword,x,y:y+0.18,z:index+1,label:row.keyword,
        detail:entityName+' · '+label+' · 序位 '+(index+1),group:String(entity.style_no)
      }));
    }
  }
  return points;
}
function escapeHtml(value){
  return String(value??'').replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
}

export default function KeywordGraph3DV2({
  groups=[],
  onSelect,
  keywordGroups=DEFAULT_KEYWORD_GROUPS,
  entityLabel='風格',
  title='風格與關鍵詞空間圖',
  description='橫軸代表分類，縱軸分成主體與關鍵詞分類；深度表示各組內的排序。拖曳旋轉，點選節點查看資料。'
}){
  const containerRef=useRef(null);
  const graphRef=useRef(null);
  const onSelectRef=useRef(onSelect);
  const [selected,setSelected]=useState(null);
  const [error,setError]=useState('');
  const points=useMemo(()=>graphPoints(Array.isArray(groups)?groups:[],keywordGroups,entityLabel),[groups,keywordGroups,entityLabel]);
  onSelectRef.current=onSelect;

  useEffect(()=>{
    let cancelled=false;
    let graph=null;
    setError('');
    if(!containerRef.current||!points.length)return undefined;
    Promise.all([import('vis-graph3d'),import('vis-data')]).then(([graphModule,dataModule])=>{
      if(cancelled||!containerRef.current)return;
      const Graph3d=graphModule.Graph3d||graphModule.default?.Graph3d;
      const DataSet=dataModule.DataSet||dataModule.default?.DataSet;
      if(!Graph3d||!DataSet)throw new Error('vis-graph3d 元件載入失敗');
      const data=new DataSet(points.map(({id,x,y,z,label,detail,group})=>({id,x,y,z,label,detail,group})));
      const accent=getComputedStyle(containerRef.current).getPropertyValue('--loc-accent').trim()||'#7c9bbd';
      graph=new Graph3d(containerRef.current,data,{
        width:'100%',height:'480px',style:'dot',showPerspective:true,showGrid:true,
        keepAspectRatio:true,verticalRatio:0.55,legendLabel:entityLabel,
        xLabel:entityLabel+'分類',yLabel:'分類層級',zLabel:'關鍵詞序位',
        xValueLabel:value=>entityLabel+' '+value,
        yValueLabel:value=>Math.round(value)===0?entityLabel:(keywordGroups[Math.round(value)-1]?.[1]||String(value)),
        tooltip:point=>'<strong>'+escapeHtml(point?.label||'')+'</strong><br>'+escapeHtml(point?.detail||''),
        dataColor:{fill:accent,stroke:accent,strokeWidth:2},
        showAnimationControls:false
      });
      graph.on('click',item=>{
        const point=points.find(candidate=>candidate.id===item?.id);
        setSelected(point||null);
        if(point)onSelectRef.current?.(point);
      });
      graphRef.current=graph;
    }).catch(reason=>{if(!cancelled)setError(reason?.message||'vis-graph3d 載入失敗');});
    return()=>{cancelled=true;graph?.destroy();graphRef.current=null;};
  },[points,entityLabel,keywordGroups]);

  return <section className="loc-keyword-graph3d" aria-label="關鍵詞 3D 圖">
    <h3>{title}</h3>
    <p>{description}</p>
    {error?<p className="scope-v2-status scope-v2-error">{error}</p>:null}
    {points.length?<div ref={containerRef} className="loc-keyword-graph3d-canvas" role="img" aria-label={'關鍵詞 3D 圖，'+points.length+' 個節點'}/>:<p className="scope-v2-status">沒有可顯示的關鍵詞。</p>}
    {selected?<p className="scope-v2-meta" aria-live="polite">選取：{selected.label}｜{selected.detail}</p>:null}
  </section>;
}
