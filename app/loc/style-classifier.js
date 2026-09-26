'use client';

import {selectNeonRows} from './neon-repository';

let canonicalCatalogPromise=null;

async function selectAllRows(table,{columns,filters=[]}){
  const rows=[];let offset=0;
  while(true){
    const result=await selectNeonRows(table,{columns,filters,range:[offset,offset+4999]});
    rows.push(...result.rows);
    if(result.rows.length<5000)break;
    offset+=result.rows.length;
  }
  return rows;
}

function normalize(value){
  return String(value??'').normalize('NFKC').toLocaleLowerCase('zh-Hant');
}

function compareRank(a,b){
  return Number(b.count||0)-Number(a.count||0)
    ||Number(a.order||0)-Number(b.order||0)
    ||String(a.label||'').localeCompare(String(b.label||''));
}

export async function selectCanonicalStyleCatalog(){
  if(canonicalCatalogPromise)return canonicalCatalogPromise;
  canonicalCatalogPromise=(async()=>{
    const [runes,keywords]=await Promise.all([
      selectAllRows('silver.lrunes',{
        columns:'rune_number,rune_name,group_name,record_type',
        filters:[{column:'record_type',operator:'eq',value:'rune'}]
      }),
      selectAllRows('silver.lrunes',{
        columns:'rune_number,keyword,active,record_type',
        filters:[
          {column:'record_type',operator:'eq',value:'keyword'},
          {column:'active',operator:'eq',value:true}
        ]
      })
    ]);
    const runeMap=new Map(runes.map(row=>[Number(row.rune_number),{
      rune_number:Number(row.rune_number),
      style_label:String(row.rune_name||'').trim(),
      style_group:String(row.group_name||'').trim()
    }]));
    return keywords.map((row,index)=>{
      const rune=runeMap.get(Number(row.rune_number));
      const keyword=normalize(row.keyword).trim();
      if(!rune||!keyword)return null;
      return {
        keyword,
        rune_number:rune.rune_number,
        style_label:rune.style_label,
        style_group:rune.style_group,
        order:index
      };
    }).filter(Boolean).sort((a,b)=>b.keyword.length-a.keyword.length||a.order-b.order);
  })().catch(error=>{
    canonicalCatalogPromise=null;
    throw error;
  });
  return canonicalCatalogPromise;
}

export function styleTextOf(row={}){
  return [
    row.title,row.content,row.meta_tags,row.style_tags,row.description,row.media_metadata_text
  ].filter(Boolean).join(' ');
}

export function classifyStyleText(value,catalog=[]){
  const text=normalize(value);
  if(!text||!catalog.length)return {
    style_label:'',style_group:'',hit_count:0,rune_counts:[],group_counts:[]
  };

  const claimed=new Uint8Array(text.length);
  const runeCounts=new Map();
  const groupCounts=new Map();
  let hitCount=0;

  for(const item of catalog){
    const keyword=item.keyword;
    if(!keyword)continue;
    let from=0;
    while(from<text.length){
      const at=text.indexOf(keyword,from);
      if(at<0)break;
      const end=at+keyword.length;
      let overlaps=false;
      for(let i=at;i<end;i++){
        if(claimed[i]){overlaps=true;break;}
      }
      if(!overlaps){
        for(let i=at;i<end;i++)claimed[i]=1;
        hitCount+=1;
        const runeKey=String(item.rune_number);
        const rune=runeCounts.get(runeKey)||{
          key:runeKey,label:item.style_label,group:item.style_group,
          order:Number(item.rune_number)||0,count:0
        };
        rune.count+=1;
        runeCounts.set(runeKey,rune);
        if(item.style_group){
          const group=groupCounts.get(item.style_group)||{
            key:item.style_group,label:item.style_group,order:0,count:0
          };
          group.count+=1;
          groupCounts.set(item.style_group,group);
        }
      }
      from=at+Math.max(1,keyword.length);
    }
  }

  const rankedRunes=[...runeCounts.values()].sort(compareRank);
  const rankedGroups=[...groupCounts.values()].sort(compareRank);
  return {
    style_label:rankedRunes[0]?.label||'',
    style_group:rankedGroups[0]?.label||'',
    hit_count:hitCount,
    rune_counts:rankedRunes,
    group_counts:rankedGroups
  };
}

export async function classifyStyleRows(rows=[]){
  const catalog=await selectCanonicalStyleCatalog();
  return (Array.isArray(rows)?rows:[]).map(row=>({
    ...row,
    ...classifyStyleText(styleTextOf(row),catalog)
  }));
}
