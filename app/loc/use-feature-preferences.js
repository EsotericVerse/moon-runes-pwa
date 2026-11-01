'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {usePassiveSessionAccount} from './use-account';
import {dbAuthRelation} from './db-client.mjs';
import {FEATURE_DEFAULTS,FEATURE_PREFERENCES_EVENT,
  normalizeFeaturePreferences} from './feature-preferences.mjs';

// A session's settings are read once per mounted page. A single serialized
// writer prevents a fast sequence of radio clicks losing earlier choices.
export default function useFeaturePreferences(){
  const account=usePassiveSessionAccount();
  const identity=String(account.user?.id||'');
  const [values,setValues]=useState(FEATURE_DEFAULTS);
  const [ready,setReady]=useState(false);
  const [error,setError]=useState('');
  const latest=useRef({...FEATURE_DEFAULTS});
  const pending=useRef(Promise.resolve());
  const edited=useRef(false);
  useEffect(()=>{
    let active=true;
    edited.current=false;
    latest.current={...FEATURE_DEFAULTS};
    setValues({...FEATURE_DEFAULTS});
    setReady(false);
    setError('');
    if(account.loading)return()=>{active=false;};
    if(!identity){setReady(true);return()=>{active=false;};}
    dbAuthRelation('api.loc_user').select('*').limit(1).then(({data,error})=>{
      if(error)throw error;
      return data?.[0]||null;
    }).then(raw=>{
      if(!active||edited.current)return;
      const next=normalizeFeaturePreferences(raw);
      latest.current=next;setValues(next);setReady(true);
    }).catch(reason=>{
      if(!active)return;
      setError(String(reason?.message||reason));setReady(true);
    });
    return()=>{active=false;};
  },[identity,account.loading]);
  useEffect(()=>{
    const receive=event=>{
      if(event.detail?.identity!==identity)return;
      const next=normalizeFeaturePreferences(event.detail.values);
      latest.current=next;setValues(next);
    };
    window.addEventListener(FEATURE_PREFERENCES_EVENT,receive);
    return()=>window.removeEventListener(FEATURE_PREFERENCES_EVENT,receive);
  },[identity]);
  const update=useCallback((key,value)=>{
    if(!identity||!Object.hasOwn(FEATURE_DEFAULTS,key))return;
    const next=normalizeFeaturePreferences({...latest.current,[key]:value});
    edited.current=true;
    latest.current=next;setValues(next);setReady(true);setError('');
    window.dispatchEvent(new CustomEvent(FEATURE_PREFERENCES_EVENT,
      {detail:{identity,values:next}}));
    pending.current=pending.current.catch(()=>{}).then(async()=>{
      const {error:saveError}=await dbAuthRelation('api.loc_user')
        .upsert([{...next,updated_at:new Date().toISOString()}],{onConflict:'owner_id'});
      if(saveError)throw saveError;
    }).catch(reason=>{setError('設定儲存失敗：'+String(reason?.message||reason));});
  },[identity]);
  return {values,update,ready,error,identity,authenticated:Boolean(identity)};
}
