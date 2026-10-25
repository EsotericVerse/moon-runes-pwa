'use client';

import {useState} from 'react';
import {useSWRConfig} from 'swr';
import {useAsyncResource} from './use-async-resource';
import {dbAuthRelation} from './db-client.mjs';
import {useAccount} from './use-account';
import {useUiLocale} from '../i18n/ui-locale';
import {useEditDockForm} from '../modular/edit-dock';

const LABELS={
  'zh-Hant':{work:'作品分類',personal:'個人分類',help:'每一項都是來源名稱字串，不設 ID、群組或目錄。',reading:'正在讀取',readError:l.readError,notFound:l.notFound,noChanges:l.noChanges,invalid:l.invalid,duplicate:l.duplicate,noPermission:l.noPermission,saved:'已儲存。公開分類快照會於下次手動發布時同步。',denied:'沒有編輯權限。',retry:'重新讀取',item:'分類',remove:'刪除',add:'新增分類',save:'儲存',saving:'儲存中…',revert:'還原'},
  'zh-Hans':{work:'作品分类',personal:'个人分类',help:'每一项都是来源名称字符串，没有 ID、分组或目录。',reading:'正在读取',readError:'分类读取失败',notFound:'找不到 Scope 配置',noChanges:'没有待保存的修改。',invalid:'每个分类名称须为 1–80 字。',duplicate:'分类名称不能重复。',noPermission:'没有写入权限，分类未保存。',saved:'已保存。公开分类快照将在下次手动发布时同步。',denied:'没有编辑权限。',retry:'重新读取',item:'分类',remove:'删除',add:'新增分类',save:'保存',saving:'保存中…',revert:'还原'},
  en:{work:'Work categories',personal:'Personal categories',help:'Each entry is a literal source name. No IDs, groups or folders.',reading:'Loading',readError:'Failed to load categories',notFound:'Scope settings not found',noChanges:'No changes to save.',invalid:'Each name must contain 1–80 characters.',duplicate:'Category names must be unique.',noPermission:'Unable to save; check write permissions.',saved:'Saved. The public snapshot will update on the next manual publish.',denied:'You do not have permission to edit categories.',retry:'Retry',item:'Category',remove:'Remove',add:'Add category',save:'Save',saving:'Saving…',revert:'Revert'},
  ja:{work:'作品カテゴリー',personal:'個人カテゴリー',help:'各項目は出典名の文字列です。ID・グループ・階層はありません。',reading:'読み込み中',readError:'分類の読み込みに失敗しました',notFound:'Scope 設定がありません',noChanges:'未保存の変更はありません。',invalid:'分類名は 1～80 文字で入力してください。',duplicate:'分類名は重複できません。',noPermission:'書き込み権限がなく保存できません。',saved:'保存しました。公開情報は次回の手動公開時に反映されます。',denied:'編集権限がありません。',retry:'再読み込み',item:'分類',remove:'削除',add:'分類を追加',save:'保存',saving:'保存中…',revert:'元に戻す'}
};

// Each editable entry is a string; one text[] per Scope, without an item ID.
export default function FlatClassificationEditor({scopeId='loc'}){
  const account=useAccount();
  const {locale}=useUiLocale();
  const l=LABELS[locale]||LABELS['zh-Hant'];
  const {mutate}=useSWRConfig();
  const global=scopeId==='loc';
  const valid=/^[a-z][a-z0-9]{0,14}$/.test(scopeId);
  const allowed=valid&&Boolean(account.user&&!account.loading&&!account.permissionLoading&&
    (global?account.canManageGlobalSync():account.canManageScopeSync(scopeId)));
  const [draft,setDraft]=useState(null);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  const query=useAsyncResource(['txt-class-list',scopeId],async()=>{
    const {data,error}=await dbAuthRelation('silver.'+scopeId).select('txt_class').eq('id',scopeId).maybeSingle();
    if(error)throw new Error(error.message||'分類讀取失敗');
    if(!data)throw new Error('找不到 Scope 設定');
    return Array.isArray(data.txt_class)?data.txt_class:[];
  },{enabled:allowed});
  const original=query.data||[];
  const rows=draft===null?original:draft;
  const changed=draft!==null&&JSON.stringify(draft)!==JSON.stringify(original);
  const title=global?l.work:l.personal;
  const change=(index,value)=>{setDraft(prev=>{
    const next=[...(prev===null?original:prev)];next[index]=value;return next;
  });setNotice('');};
  async function save(){
    if(!allowed||busy||query.isPending||query.error)return false;
    if(!changed){setNotice('沒有待儲存的修改。');return true;}
    const names=rows.map(name=>String(name).trim());
    if(names.some(name=>!name||name.length>80)){setNotice('每個分類名稱須為 1–80 字。');return false;}
    const normalized=names.map(name=>name.toLocaleLowerCase());
    if(new Set(normalized).size!==normalized.length){setNotice('分類名稱不能重複。');return false;}
    setBusy(true);setNotice('');
    try{
      const {data,error}=await dbAuthRelation('silver.'+scopeId).update({txt_class:names})
        .eq('id',scopeId).select('id');
      if(error||!data?.length)throw new Error(error?.message||'沒有寫入權限，分類未儲存。');
      await query.refetch();
      setDraft(null);
      await mutate(key=>Array.isArray(key)&&(
        ['scope-others-source-summary','own-scope-source-catalog','culture-source-classification','scope-overview','statistics-source-taxonomy'].includes(key[0])));
      setNotice(title+' '+l.saved);
      return true;
    }catch(error){setNotice(String(error?.message||error));return false;}
    finally{setBusy(false);}
  }
  useEditDockForm({save,isDirty:()=>changed,isBusy:()=>busy,
    discard:()=>{setDraft(null);setNotice('');}});
  if(!allowed)return <section className="loc-card scope-status scope-error" role="alert">{title}：{l.denied}</section>;
  return <section className="loc-card classification-inline">
    <h2>{title}</h2>
    <p>{l.help}</p>
    {query.isPending?<p role="status" className="scope-status">{l.reading} {title}…</p>:null}
    {query.error?<p role="alert" className="scope-status scope-error">{String(query.error.message||query.error)}
      <button type="button" className="loc-button" onClick={()=>query.refetch()}>{l.retry}</button>
    </p>:null}
    {!query.isPending&&!query.error?<form onSubmit={event=>{event.preventDefault();void save();}}>
      <div className="classification-inline__list">
        {rows.map((name,index)=><div className="classification-inline__row" key={index}>
          <label className="classification-inline__field">
            <span>{l.item} {index+1}</span>
            <input type="text" maxLength={80} required disabled={busy}
              value={name} onChange={event=>change(index,event.target.value)}/>
          </label>
          <button type="button" className="loc-button" disabled={busy}
            onClick={()=>{setDraft(rows.filter((_,i)=>i!==index));setNotice('');}}>{l.remove}</button>
        </div>)}
      </div>
      <div className="classification-inline__actions">
        <button type="button" className="loc-button" disabled={busy}
          onClick={()=>{setDraft([...rows,'']);setNotice('');}}>{l.add}</button>
        <button className="loc-button primary" type="submit" disabled={busy||!changed}>{busy?l.saving:l.save+' '+title}</button>
        <button type="button" className="loc-button" disabled={busy||!changed}
          onClick={()=>{setDraft(null);setNotice('');}}>{l.revert}</button>
      </div>
    </form>:null}
    {notice?<p className="scope-status" role="status">{notice}</p>:null}
  </section>;
}
