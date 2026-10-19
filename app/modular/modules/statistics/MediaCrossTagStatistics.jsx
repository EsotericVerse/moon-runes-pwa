'use client';
import FieldText from '../../../i18n/FieldText';
import {UI_COPY} from '../../../i18n/ui-copy';
import UiText,{useUiText} from '../../../i18n/UiText';
import {useMemo,useRef,useState} from 'react';
import dynamic from 'next/dynamic';
import {featureDataErrorMessage} from '../../feature-data-state';
import {StatisticsFacets} from '../../../loc/statistics-facets';
import StatisticsChartFrame from './StatisticsChartFrame';

// The full chart renderer mounts only for an active media intersection.
const StatisticsMultiChart=dynamic(()=>import('./StatisticsMultiChart'),{loading:()=>null});

function MediaCrossTagPicker({title,options,selected,onChange}){
  const chosen=new Set(selected);
  return <details className="scope-stat-cross-picker">
    <summary><FieldText text={title}/>（<UiText id="uiExtra.statisticsView.selected"/> {chosen.size} <UiText id="uiExtra.statisticsView.unitItem"/>）</summary>
    <div style={{display:'flex',gap:8,flexWrap:'wrap',margin:'8px 0'}}>
      <button className="loc-button" type="button" onClick={()=>onChange(options.map(x=>x.key))}><UiText id="uiExtra.statisticsView.selectAll"/></button>
      <button className="loc-button" type="button" onClick={()=>onChange([])}><UiText id="uiExtra.statisticsView.clear"/></button>
    </div>
    <div style={{maxHeight:210,overflowY:'auto',display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(165px,1fr))',gap:6}}>
      {options.map(tag=><label key={tag.key} className="scope-setting-toggle" style={{display:'flex',alignItems:'center',gap:6}}>
        <input type="checkbox" checked={chosen.has(tag.key)} onChange={event=>{
          onChange(event.target.checked?[...chosen,tag.key]:[...chosen].filter(key=>key!==tag.key));
        }}/>
        <span>{tag.label}（{tag.count}）</span>
      </label>)}
    </div>
  </details>;
}
export default function MediaCrossTagStatistics({scope,rows=[],range={},zoomLevel=0,onZoomLevelChange,facetTrend,loadGalaxyStatistics}){
  const t=useUiText();
  const [leftOverride,setLeftOverride]=useState(null);
  const [rightOverride,setRightOverride]=useState(null);
  const [mode,setMode]=useState('ranking');
  const [selectedPair,setSelectedPair]=useState('');
  const [works,setWorks]=useState([]);
  const [worksOffset,setWorksOffset]=useState(0);
  const [worksHasMore,setWorksHasMore]=useState(false);
  const [worksLoading,setWorksLoading]=useState(false);
  const [worksError,setWorksError]=useState('');
  const worksRequest=useRef(0);
  const catalog=useMemo(()=>StatisticsFacets.cross.mediaCrossTagCatalog(rows),[rows]);
  const tagKeys=new Set(catalog.options.map(x=>x.key));
  const defaults=StatisticsFacets.cross.defaultMediaCrossAxes(catalog);
  const left=leftOverride===null?defaults.left:leftOverride.filter(x=>tagKeys.has(x));
  const leftSet=new Set(left);
  const right=rightOverride===null?catalog.options.filter(x=>!leftSet.has(x.key)).map(x=>x.key)
    :rightOverride.filter(x=>tagKeys.has(x));
  const pairs=useMemo(()=>StatisticsFacets.cross.mediaCrossIntersections(catalog,left,right),[catalog,left.join('\u0000'),right.join('\u0000')]);
  const selected=pairs.find(x=>x.key===selectedPair);
  async function loadPairWorks(pair,offset=0,append=false){
    const request=++worksRequest.current;
    setWorksLoading(true);setWorksError('');
    if(!append)setWorks([]);
    try{
      const {selectMediaCrossPairWorks}=await loadGalaxyStatistics();
      const page=await selectMediaCrossPairWorks(scope,pair,{
        startDate:range.startDate,endDate:range.endDate,offset,limit:10
      });
      if(request!==worksRequest.current)return;
      setWorks(current=>append?[...current,...page.rows]:page.rows);
      setWorksOffset(page.nextOffset);
      setWorksHasMore(page.hasMore);
    }catch(error){
      if(request===worksRequest.current)setWorksError(featureDataErrorMessage(error,UI_COPY));
    }finally{
      if(request===worksRequest.current)setWorksLoading(false);
    }
  }
  function togglePairWorks(pair){
    if(selectedPair===pair.key){
      worksRequest.current++;setSelectedPair('');setWorks([]);setWorksHasMore(false);setWorksError('');
      return;
    }
    setSelectedPair(pair.key);setWorksOffset(0);setWorksHasMore(false);
    loadPairWorks(pair,0,false);
  }
  const leading=pairs.slice(0,12);
  const trendPairs=pairs.slice(0,6);
  const trendData=useMemo(()=>{
    const daily=trendPairs.flatMap(pair=>[...pair.days].map(([day,item_count])=>({
      day,category:pair.key,item_count
    })));
    return facetTrend(daily,{
      startDate:range.startDate,endDate:range.endDate,bucket:range.bucket||'day'
    },trendPairs.map(pair=>pair.key));
  },[pairs,range.startDate,range.endDate,range.bucket]);
  return <section className="scope-stat-cross" aria-label={t('uiExtra.statisticsView.crossLabel')}>
    <h3><UiText id="uiExtra.statisticsView.crossTitle"/></h3>
    <p className="scope-status"><UiText id="uiExtra.statisticsView.crossHint"/></p>
    {!catalog.options.length?<p className="scope-status"><UiText id="uiExtra.statisticsView.noPairsInRange"/></p>:<>
      <div className="scope-stat-controls" style={{alignItems:'start'}}>
        <MediaCrossTagPicker title={t('uiExtra.statisticsView.tagGroup1')} options={catalog.options} selected={left} onChange={setLeftOverride}/>
        <MediaCrossTagPicker title={t('uiExtra.statisticsView.tagGroup2')} options={catalog.options} selected={right} onChange={setRightOverride}/>
        <button type="button" className="loc-button" onClick={()=>{
          setLeftOverride(null);setRightOverride(null);worksRequest.current++;setSelectedPair('');setWorks([]);setWorksHasMore(false);
        }}><UiText id="uiExtra.statisticsView.resetPairs"/></button>
      </div>
      <div className="scope-stat-controls">
        <label><span><UiText id="uiExtra.statisticsView.chart"/></span><select className="scope-select" value={mode} onChange={event=>setMode(event.target.value)}>
          <option value="ranking"><UiText id="uiExtra.statisticsView.pairCount"/></option><option value="trend"><UiText id="uiExtra.statisticsView.pairTrend"/></option>
        </select></label>
        <span><UiText id="uiExtra.statisticsView.matchingPairs"/>：{pairs.length.toLocaleString()} <UiText id="uiExtra.statisticsView.unitPair"/></span>
      </div>
      {!pairs.length?<p className="scope-status"><UiText id="uiExtra.statisticsView.noPairOverlap"/></p>:<>
        <StatisticsChartFrame level={zoomLevel} onChange={onZoomLevelChange} range={range} idPrefix="scope-stat-cross">
          {mode==='ranking'?<div style={{overflowX:'auto'}}>
            <div style={{minWidth:480}}>
              <StatisticsMultiChart type="bar" barLayout="vertical" rows={[]}
                distribution={leading.map(pair=>({
                  key:pair.key,name:pair.leftLabel+' × '+pair.rightLabel,value:pair.count
                }))}
                height={Math.max(250,leading.length*38+70)}
                onCategoryClick={key=>{const pair=leading.find(item=>item.key===key);if(pair)togglePairWorks(pair);}}/>
            </div>
          </div>:<StatisticsMultiChart type="line"
            rows={trendData}
            series={trendPairs.map(pair=>({key:pair.key,label:pair.leftLabel+' × '+pair.rightLabel}))}
            onSeriesClick={key=>{const pair=trendPairs.find(item=>item.key===key);if(pair)togglePairWorks(pair);}}
            height={420}/>}

        </StatisticsChartFrame>
        {selected?<div className="scope-stat-cross-matches">
          <h4>{selected.leftLabel} × {selected.rightLabel} · {selected.count} {t('uiExtra.statisticsView.unitCase')}</h4>
          <div className="scope-ranking" style={{maxHeight:360,overflowY:'auto'}}>
            {works.map(media=><div key={media.id}>
              <strong>{media.title||media.id}</strong>
              <span>{media.day||t('uiExtra.statisticsView.noDate')} {/^https?:\/\//iu.test(media.url)?<a href={media.url} target="_blank" rel="noopener noreferrer"><UiText id="uiExtra.statisticsView.viewMedia"/></a>:null}</span>
            </div>)}
          </div>
          {worksLoading?<p className="scope-status"><UiText id="uiExtra.pagination.loading"/></p>:null}
          {worksError?<p className="scope-status scope-error">{worksError}</p>:null}
          {worksHasMore?<button type="button" className="loc-button" disabled={worksLoading} onClick={()=>loadPairWorks(selected,worksOffset,true)}><UiText id="uiExtra.pagination.loadMore"/></button>:null}
        </div>:null}
      </>}
    </>}
  </section>;
}

