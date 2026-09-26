import {z} from 'zod';
import {featureHrefV2} from './scope-registry.v2';

const NAVIGATION_FIELDS=Object.freeze([
  'q','identity','source','period','anchor','from','to','rankingType','keywordGroup','statTab','statDomain','statFace'
]);

const NavigationValue=z.string().trim().min(1).max(240);
const StatisticsTab=z.enum(['ranking','keywords','charts']);
const StatisticsDomain=z.enum(['text','media']);
const StatisticsFace=z.enum(['overview','statistics','keywords','textKeywords','mediaKeywords']);

export const FeatureNavigationSchema=z.object({
  q:NavigationValue.optional(),
  identity:NavigationValue.optional(),
  source:NavigationValue.optional(),
  period:NavigationValue.optional(),
  anchor:NavigationValue.optional(),
  from:NavigationValue.optional(),
  to:NavigationValue.optional(),
  rankingType:NavigationValue.optional(),
  keywordGroup:NavigationValue.optional(),
  statTab:StatisticsTab.optional(),
  statDomain:StatisticsDomain.optional(),
  statFace:StatisticsFace.optional()
}).strict();

function valueOf(...values){
  for(const value of values){
    if(value===undefined||value===null)continue;
    const text=String(value).trim();
    if(text)return text.slice(0,240);
  }
  return undefined;
}

function payloadOf(row){
  return row?.payload&&typeof row.payload==='object'&&!Array.isArray(row.payload)?row.payload:{};
}

export function readFeatureNavigation(searchParams){
  const raw={};
  for(const key of NAVIGATION_FIELDS){
    const value=searchParams?.get?.(key);
    if(value)raw[key]=value;
  }
  const parsed=FeatureNavigationSchema.safeParse(raw);
  return parsed.success?parsed.data:{};
}

export function featureNavigationQuery(navigation={}){
  const params=new URLSearchParams();
  const parsed=FeatureNavigationSchema.safeParse(navigation);
  if(!parsed.success)return '';
  for(const key of NAVIGATION_FIELDS){
    const value=parsed.data[key];
    if(value)params.set(key,value);
  }
  return params.toString();
}

export function featureNavigationHref(scopeId,featureId,navigation={}){
  const base=featureHrefV2(scopeId,featureId);
  const query=featureNavigationQuery(navigation);
  return query?base+'?'+query:base;
}

export function resolveSearchScope(collectionId,source,row,currentScopeId='loc'){
  const explicit=valueOf(row?.scope_id,row?.scope);
  if(explicit==='lunarunes')return 'lunarunes';
  if(explicit==='lo3rwang'||explicit==='author'||explicit==='personal')return 'lo3rwang';
  if(collectionId==='月之符文')return 'lunarunes';
  if(collectionId==='lo3rwang')return 'lo3rwang';
  const label=String(source||'')+' '+String(row?.context_type||'')+' '+String(row?.work_type||'');
  if(/符文|rune|lunarunes/i.test(label))return 'lunarunes';
  if(/作者|歌曲|作品|時期|全文|文化|author|song|work/i.test(label))return 'lo3rwang';
  return currentScopeId;
}

export function buildSearchNavigation(collectionId,source,row,query,currentScopeId='loc'){
  const payload=payloadOf(row);
  const targetScope=resolveSearchScope(collectionId,source,row,currentScopeId);
  return {
    targetScope,
    state:{
      q:valueOf(query),
      identity:valueOf(
        row?.galaxy_id,row?.media_id,row?.song_id,
        row?.rune_number!==undefined?'rune:'+row.rune_number:undefined,
        row?.context_key,row?.entry_key,row?.id,
        payload.id,payload.identity
      ),
      source:valueOf(row?.source,row?.source_name,source),
      period:valueOf(
        row?.period_code,row?.era_code,row?.period,row?.era_id,
        payload.period_code,payload.era_code,payload.period,payload.era_id
      ),
      anchor:valueOf(
        row?.anchor_id,row?.anchor_role,row?.anchor_type,
        payload.anchor_id,payload.anchor_role,payload.anchor_type,
        payload.anchor?.id,payload.anchor?.role,payload.anchor?.type
      ),
      from:valueOf(row?.start_date,row?.active_from,row?.date,payload.start_date),
      to:valueOf(row?.end_date,row?.active_until,payload.end_date)
    }
  };
}

function hasTemporalCondition(state){
  return Boolean(state.period||state.anchor||state.from||state.to);
}

export function featureNavigationLinks({targetScope,state}){
  const links=[];
  if(hasTemporalCondition(state)){
    links.push({id:'culture',label:'文化 Time River',href:featureNavigationHref(targetScope,'culture',state)});
  }
  if(['loc','lunarunes','lo3rwang'].includes(targetScope)){
    links.push({id:'statics-ranking',label:'統計排行榜',href:featureNavigationHref(targetScope,'statics',{...state,statTab:'ranking'})});
  }
  links.push({id:'statics-charts',label:'統計圖',href:featureNavigationHref(targetScope,'statics',{...state,statTab:'charts'})});
  return links;
}
