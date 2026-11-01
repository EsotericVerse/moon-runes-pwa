'use client';
import {useEffect,useState} from 'react';
import useFeaturePreferences from './use-feature-preferences';
import {FEATURE_CHOICES} from './feature-preferences.mjs';

const ROWS=[
  {title:'文化設定',fields:[
    ['cultureTime','首頁時間顯示',[['anchor','定錨點'],['period','期間'],['era','時代']]],
    ['cultureDisplay','首頁顯示',[['density','文章密度'],['keywords','關鍵詞']]],
    ['cultureUnit','時間單位顯示',[['day','日'],['week','週'],['month','月'],['year','年']]],
    ['cultureSort','文章排列',[['desc','最新的優先'],['asc','最舊的優先']]]
  ]},
  {title:'統計設定',fields:[
    ['statisticsDisplay','首頁統計顯示',[['source','來源'],['media_type','多媒體']]],
    ['statisticsUnit','時間單位顯示',[['day','日'],['week','週'],['month','月'],['year','年']]],
    ['statisticsSort','文章排列',[['desc','最新的優先'],['asc','最舊的優先']]]
  ]},
  {title:'痕跡設定',fields:[
    ['traceDisplay','首頁空間顯示',[['anchor','定錨點'],['path','路線圖'],['trace','痕跡圖']]],
    ['traceTime','時間單位顯示',[['none','無'],['period','期間'],['era','時代']]],
    ['traceSort','文章排列',[['desc','最新的優先'],['nearest','最近的優先']]]
  ]},
  {title:'搜尋設定',fields:[
    ['searchField','搜尋方式',[['content','文章內容'],['title','標題文字']]],
    ['searchSort','文章排列',[['asc','最舊的優先'],['desc','最新的優先']]]
  ]}
];
function Choice({name,label,options,value,onChange}){
  return <fieldset className="scope-settings-feature-field" style={{border:0,padding:0,margin:'.65rem 0'}}>
    <legend style={{fontWeight:600,marginBottom:'.35rem'}}>{label}</legend>
    <div className="scope-stat-controls" role="group" aria-label={label}>
      {options.map(([id,text])=><label key={id} style={{display:'inline-flex',gap:'.35rem',alignItems:'center',marginRight:'.7rem'}}>
        <input type="radio" name={'user-feature-'+name} value={id}
          checked={value===id} onChange={()=>onChange(name,id)}/>{text}
      </label>)}
    </div>
  </fieldset>;
}
export default function FeaturePreferencesPanel(){
  const {values,update,ready,error,authenticated}=useFeaturePreferences();
  const [keywordOptions,setKeywordOptions]=useState([]);
  const [keywordError,setKeywordError]=useState('');
  useEffect(()=>{
    if(!authenticated)return;
    let active=true;
    // Public/shared Classes only. Never read private Keyword libraries.
    import('./keyword-analysis').then(async({selectAvailableKeywordClasses})=>{
      const collected=[];
      for(const scopeId of ['lo3rwang','lrunes']){
        try{
          const result=await selectAvailableKeywordClasses(scopeId);
          for(const row of result.classes||[])collected.push({
            value:scopeId+':'+row.classUid,
            label:(scopeId==='lo3rwang'?'作者作品':'月之符文')+'／'+
              [row.categoryName,row.name].filter(Boolean).join('／')
          });
        }catch{/* Other Scope may not allow this user to read its Class list. */}
      }
      if(active)setKeywordOptions(collected);
    }).catch(reason=>{if(active)setKeywordError(String(reason?.message||reason));});
    return()=>{active=false;};
  },[authenticated]);
  if(!authenticated)return <section className="loc-card">
    <h2>濾鏡設定與功能設定</h2>
    <p className="scope-status">登入 User 帳號後，可立即儲存個人濾鏡與功能設定。</p>
  </section>;
  return <div className="loc-settings-panel-group">
    <section className="loc-card">
      <h2>濾鏡設定</h2>
      <Choice name="keywordChoice" label="關鍵詞群組設定"
        options={[['none','無'],...keywordOptions.map(row=>[row.value,row.label]),
          ...(values.keywordChoice!=='none'&&!keywordOptions.some(row=>row.value===values.keywordChoice)
            ?[[values.keywordChoice,'目前設定的群組（未公開或尚未載入）']]:[])]}
        value={values.keywordChoice} onChange={update}/>
      {keywordError?<p role="alert" className="scope-status scope-error">{keywordError}</p>:null}
    </section>
    <h2>功能設定</h2>
    {ROWS.map(group=><section className="loc-card" key={group.title}>
      <h3>{group.title}</h3>
      {group.fields.map(([key,label,options])=><Choice key={key}
        name={key} label={label} options={options} value={values[key]} onChange={update}/>)}
    </section>)}
    {!ready?<p role="status" className="scope-status">正在載入個人設定…</p>:null}
    {error?<p role="alert" className="scope-status scope-error">{error}</p>:null}
    <p className="scope-status">選取後立即更新，儲存在登入帳號的個人設定中；不修改公開資料。</p>
  </div>;
}
