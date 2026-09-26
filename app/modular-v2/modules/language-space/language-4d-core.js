export const LANGUAGE_4D_AXES=Object.freeze([
  Object.freeze({id:'x',label:'關係',role:'relation'}),
  Object.freeze({id:'y',label:'分類',role:'classification'}),
  Object.freeze({id:'z',label:'強度',role:'weight'}),
  Object.freeze({id:'t',label:'時間',role:'time'})
]);

export const LANGUAGE_4D_FACES=Object.freeze([
  Object.freeze({id:'time',label:'時間長河',kinds:Object.freeze(['time','text','media']),usesTime:true}),
  Object.freeze({id:'space',label:'空間分析',kinds:Object.freeze(['text','keyword','media']),usesTime:false}),
  Object.freeze({id:'extension',label:'延伸',kinds:Object.freeze(['media']),usesTime:true}),
  Object.freeze({id:'manage',label:'管理',kinds:Object.freeze([]),usesTime:false})
]);

export const LANGUAGE_4D_DEFAULT_FACE='space';
export const LANGUAGE_4D_STATE_KEY='loc:language-4d:shared-state';

export function language4DFace(id=LANGUAGE_4D_DEFAULT_FACE){
  return LANGUAGE_4D_FACES.find(face=>face.id===id)
    ||LANGUAGE_4D_FACES.find(face=>face.id===LANGUAGE_4D_DEFAULT_FACE);
}

function hash(value){
  let h=2166136261;
  for(const ch of String(value||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}
  return Math.abs(h>>>0);
}
function dateExtent(items){
  const values=items.map(item=>Date.parse(item.date||'')).filter(Number.isFinite);
  if(!values.length)return [0,1];
  const min=Math.min(...values),max=Math.max(...values);
  return min===max?[min,min+86400000]:[min,max];
}
function scale(value,min,max,a=-4.8,b=4.8){
  if(!Number.isFinite(value))return 0;
  return a+(value-min)*(b-a)/(max-min||1);
}

export function projectLanguage4D(items=[],faceId=LANGUAGE_4D_DEFAULT_FACE){
  const face=language4DFace(faceId);
  const [minDate,maxDate]=dateExtent(items);
  const maxValue=Math.max(1,...items.map(item=>Number(item.value)||1));
  return new Map(items.map((item,index)=>{
    const t=Date.parse(item.date||'');
    const value=Math.max(1,Number(item.value)||1);
    if(face.id==='time'){
      const x=Number.isFinite(t)?scale(t,minDate,maxDate):(index%11-5)*.7;
      const y=item.kind==='time'?0:item.kind==='media'?2:item.kind==='keyword'?-2:-1;
      const z=Math.log2(value+1)/Math.log2(maxValue+1)*3.2;
      return [item.id,[x,y,z]];
    }
    if(face.id==='extension'){
      const x=Number.isFinite(t)?scale(t,minDate,maxDate):(index%9-4)*1.05;
      const y=((hash(item.source)%9)-4)*.55;
      const z=Math.log2(value+1)/Math.log2(maxValue+1)*3.4;
      return [item.id,[x,y,z]];
    }
    const key=hash(item.tags||item.source||item.label);
    const angle=(key%360)*Math.PI/180;
    const radius=1.6+((key>>8)%360)/100;
    const y=item.kind==='keyword'?1.6:item.kind==='media'?.8:-.8;
    const z=Math.log2(value+1)/Math.log2(maxValue+1)*3;
    return [item.id,[Math.cos(angle)*radius,y+z*.22,Math.sin(angle)*radius]];
  }));
}

export function language4DState(raw={}){
  const face=language4DFace(raw.face).id;
  return {
    face,
    query:String(raw.query||''),
    start:String(raw.start||''),
    end:String(raw.end||''),
    selected:String(raw.selected||'')
  };
}
