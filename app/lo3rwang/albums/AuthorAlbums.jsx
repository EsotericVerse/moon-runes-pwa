'use client';

import {useQuery} from '@tanstack/react-query';
import ContextReturnNav from '../../modular/ContextReturnNav';
import ScopeEditableBlocks from '../../loc/ScopeEditableBlocks';
import {selectRows} from '../../loc/db-query.mjs';

const SONG_HEADING='## Suno 正式曲序連結';
const ALBUM_URL=/^https:\/\/suno\.com\/album\/[0-9a-f-]{36}$/i;
const SONG_URL=/^https:\/\/suno\.com\/song\/[0-9a-f-]{36}$/i;
const NUMBER_NAMES={一:1,二:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9,十:10};

function albumNumber(tags=''){
  const match=String(tags||'').match(/第([一二三四五六七八九十]+)張專輯/);
  if(!match)return 999;
  const key=match[1];
  if(NUMBER_NAMES[key])return NUMBER_NAMES[key];
  if(key.startsWith('十'))return 10+(NUMBER_NAMES[key.slice(1)]||0);
  return 999;
}
function albumTitle(value=''){
  return String(value||'').split('｜')[0].trim()||'未命名專輯';
}
function introParagraphs(content=''){
  const text=String(content||'').split(SONG_HEADING)[0];
  const section=text.includes('## 專輯介紹')
    ?text.split('## 專輯介紹')[1].split(/^## /m)[0]
    :text;
  return section
    .replace(/^#.*$/gm,'')
    .replace(/\*\*/g,'')
    .replace(/\*/g,'')
    .trim()
    .split(/\n\s*\n/)
    .map(value=>value.trim().replace(/\n/g,' '))
    .filter(Boolean)
    .slice(0,12);
}
function listedSongs(content=''){
  const section=String(content||'').split(SONG_HEADING)[1]||'';
  return [...section.matchAll(/^(\d{1,2})\.\s+(.+?)\s+—\s+(https:\/\/suno\.com\/song\/[0-9a-f-]{36})\s*$/gmi)]
    .map(([,index,title,url])=>({index:Number(index),title:title.trim(),url}))
    .filter(item=>SONG_URL.test(item.url))
    .sort((a,b)=>a.index-b.index);
}
async function loadPublishedAlbums(){
  // A published Suno album link is the single visibility gate.
  // Unpublished album plans in Galaxy are intentionally excluded.
  const {rows:media}=await selectRows('silver.lo3rwang_galaxy_media',{
    columns:'galaxy_link,title,url,meta_tags,createtime',
    filters:[
      {column:'media_type',operator:'eq',value:'suno'},
      {column:'url',operator:'like',value:'https://suno.com/album/%'}
    ],
    limit:100
  });
  const published=(media||[]).filter(row=>ALBUM_URL.test(String(row.url||''))&&row.galaxy_link);
  if(!published.length)return [];
  const ids=[...new Set(published.map(row=>String(row.galaxy_link||'').trim()))];
  const {rows:works}=await selectRows('silver.lo3rwang_galaxy',{
    columns:'uid,title,content,source_name,searchable',
    filters:[{column:'uid',operator:'in',value:ids},{column:'source_name',operator:'eq',value:'suno'},{column:'searchable',operator:'eq',value:true}],
    limit:100
  });
  const byId=new Map((works||[]).map(row=>[String(row.uid||'').trim(),row]));
  return published.map(row=>{
    const work=byId.get(String(row.galaxy_link||'').trim());
    if(!work)return null;
    return {...work,albumUrl:row.url,position:albumNumber(row.meta_tags),
      songs:listedSongs(work.content),intros:introParagraphs(work.content)};
  }).filter(Boolean).sort((a,b)=>a.position-b.position||a.title.localeCompare(b.title));
}
async function loadStyleGuide(){
  const {rows}=await selectRows('silver.lo3rwang_time',{
    columns:'record_id,label,style_description,status,display_order,visibility',
    filters:[{column:'record_type',operator:'eq',value:'style_comment'}],
    orders:[{column:'display_order',ascending:true},{column:'label',ascending:true}],
    limit:100
  });
  return (rows||[]).filter(row=>row.label&&row.style_description&&row.visibility!=='private');
}
function StyleGuide(){
  const styles=useQuery({queryKey:['author-album-style-guide'],queryFn:loadStyleGuide,staleTime:60_000});
  return <section className="loc-card author-albums-guide" aria-labelledby="author-style-heading">
    <p className="loc-eyebrow">Time River · Style</p>
    <h2 id="author-style-heading">風格關鍵字導引</h2>
    <p>以下直接取自作者時間長河的風格標籤。它們描述的是文字與創作思想，而非單一音樂曲風；點擊關鍵字可搜尋相關作品及文字。</p>
    {styles.isPending?<p className="scope-status">讀取風格標籤中…</p>:null}
    {styles.isError?<p className="scope-status">風格標籤暫時無法讀取，仍可使用下方專輯連結。</p>:null}
    {styles.isSuccess&&styles.data.length===0?<p className="scope-status">目前沒有可公開展示的風格標籤。</p>:null}
    {styles.data?.length?<div className="author-albums-style-grid">
      {styles.data.map(style=><a
        className="author-albums-style-link"
        key={style.record_id}
        href={'/lo3rwang/search/?q='+encodeURIComponent(style.label)}
        aria-label={'搜尋風格：'+style.label}
      >
        <strong>{style.label}</strong>
        <span>{style.style_description}</span>
        <small>探索相關創作 →</small>
      </a>)}
    </div>:null}
    <p className="author-albums-note">風格標籤屬於跨時期的文化導引，不代表某張專輯或每一首歌都只屬於單一風格；歌曲曲風請以各首 Suno 音樂資訊為準。</p>
  </section>;
}
function AlbumCard({album}){
  const label=Number.isFinite(album.position)&&album.position<999?'LP'+album.position:'Album';
  return <article className="loc-card author-albums-card" id={'album-'+album.uid.trim()}>
    <div className="author-albums-album-header">
      <div>
        <p className="loc-eyebrow">{label} · Suno Album</p>
        <h2>{albumTitle(album.title)}</h2>
        <p className="author-albums-count">{album.songs.length?album.songs.length+' 首已編目歌曲':'已公開專輯'}</p>
      </div>
      <a className="loc-button author-albums-open" href={album.albumUrl} target="_blank" rel="noopener noreferrer">在 Suno 聆聽整張專輯 ↗</a>
    </div>
    <div className="author-albums-introduction">
      {album.intros.map((paragraph,i)=><p key={i}>{paragraph}</p>)}
    </div>
    {album.songs.length?<details className="author-albums-tracklist" open>
      <summary>正式曲序 · {album.songs.length} 首</summary>
      <ol>
        {album.songs.map(song=><li key={song.index}>
          <a href={song.url} target="_blank" rel="noopener noreferrer">
            <span>{song.title}</span><span className="author-albums-listen">播放 ↗</span>
          </a>
        </li>)}
      </ol>
    </details>:<p className="author-albums-note">歌曲列表正在整理；目前可由 Suno 專輯頁查看正式曲序。</p>}
  </article>;
}
export default function AuthorAlbums(){
  const albums=useQuery({queryKey:['author-suno-albums'],queryFn:loadPublishedAlbums,staleTime:60_000});
  return <section className="loc-view author-albums-page">
    <ContextReturnNav scopeId="lo3rwang" label="回作者首頁"/>
    <ScopeEditableBlocks
      scopeId="lo3rwang"
      page="albums"
      orders={[1]}
      headingLevel={1}
      allowEditing
      allowDelete={false}
      allowEntities={false}
      allowImages={false}
      slotTag="header"
      slotClassName="loc-card scope-hero author-albums-hero"
      editSlotClassName="loc-card scope-hero author-albums-hero"
    />
    <StyleGuide/>
    <section className="author-albums-collection" aria-labelledby="author-albums-list-heading">
      <h2 id="author-albums-list-heading">已公開的音樂專輯</h2>
      {albums.isPending?<p className="scope-status">讀取已發行專輯中…</p>:null}
      {albums.isError?<p className="scope-status scope-error">專輯目錄暫時無法載入，請稍後重新整理。</p>:null}
      {albums.isSuccess&&!albums.data.length?<p className="scope-status">目前沒有已公開的專輯連結。</p>:null}
      {albums.data?.map(album=><AlbumCard key={album.uid} album={album}/>)}
    </section>
  </section>;
}
