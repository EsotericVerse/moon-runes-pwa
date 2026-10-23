'use client';

import {useCallback,useEffect,useRef,useState} from 'react';

// React lifecycle for a direct database read. No query cache, polling,
// stale-time expiration, or automatic background refetch.
export function notifyDirectReadChanged(key=[]){
  if(typeof window!=='undefined')
    window.dispatchEvent(new CustomEvent('loc-direct-read-changed',{detail:{key}}));
}
function matchesPrefix(full,partial){
  return partial.every((part,index)=>JSON.stringify(full[index])===JSON.stringify(part));
}
export function useDirectRead({queryKey=[],queryFn,enabled=true}){
  const key=JSON.stringify(queryKey);
  const reader=useRef(queryFn);
  reader.current=queryFn;
  const [revision,setRevision]=useState(0);
  const [result,setResult]=useState({key:'',data:undefined,error:null,isPending:true});
  const requestId=useRef(0);
  const refetch=useCallback(async()=>{
    const id=++requestId.current;
    setResult(current=>({key,data:current.key===key?current.data:undefined,error:null,isPending:true}));
    try{
      const data=await reader.current();
      if(requestId.current===id)setResult({key,data,error:null,isPending:false});
      return {data};
    }catch(error){
      if(requestId.current===id)setResult({key,data:undefined,error,isPending:false});
      throw error;
    }
  },[key]);
  useEffect(()=>{
    if(!enabled)return undefined;
    let active=true;
    const refresh=event=>{
      if(matchesPrefix(JSON.parse(key),event.detail?.key||[]))
        setRevision(value=>value+1);
    };
    window.addEventListener('loc-direct-read-changed',refresh);
    // Component unmount must not restore a response to a stale component.
    Promise.resolve().then(()=>{
      if(active)return refetch().catch(()=>{});
    });
    return ()=>{
      active=false;
      requestId.current+=1;
      window.removeEventListener('loc-direct-read-changed',refresh);
    };
  },[key,enabled,revision,refetch]);
  const current=result.key===key?result:{key,data:undefined,error:null,isPending:true};
  return {...current,isLoading:current.isPending,isFetching:current.isPending,
    isSuccess:!current.isPending&&!current.error,isError:Boolean(current.error),refetch};
}

export function useDirectPages({queryKey=[],queryFn,getNextPageParam,initialPageParam=null,enabled=true}){
  const key=JSON.stringify(queryKey);
  const reader=useRef(queryFn);reader.current=queryFn;
  const getNext=useRef(getNextPageParam);getNext.current=getNextPageParam;
  const [revision,setRevision]=useState(0);
  const [state,setState]=useState({key:'',pages:[],error:null,isPending:true,isFetchingNextPage:false});
  const requestId=useRef(0);
  const start=useCallback(async()=>{
    const id=++requestId.current;
    setState({key,pages:[],error:null,isPending:true,isFetchingNextPage:false});
    try{
      const first=await reader.current({pageParam:initialPageParam});
      if(requestId.current===id)
        setState({key,pages:[first],error:null,isPending:false,isFetchingNextPage:false});
    }catch(error){
      if(requestId.current===id)
        setState({key,pages:[],error,isPending:false,isFetchingNextPage:false});
    }
  },[key,initialPageParam]);
  useEffect(()=>{
    if(!enabled)return undefined;
    const refresh=event=>{
      if(matchesPrefix(JSON.parse(key),event.detail?.key||[]))
        setRevision(value=>value+1);
    };
    window.addEventListener('loc-direct-read-changed',refresh);
    void start();
    return ()=>{
      requestId.current+=1;
      window.removeEventListener('loc-direct-read-changed',refresh);
    };
  },[key,enabled,revision,start]);
  const current=state.key===key?state:{key,pages:[],error:null,isPending:true,isFetchingNextPage:false};
  const last=current.pages.at(-1);
  const next=last?getNext.current(last):undefined;
  const hasNextPage=next!==undefined&&next!==null;
  const fetchNextPage=useCallback(async()=>{
    const snapshot=state;
    if(snapshot.key!==key||snapshot.isPending||snapshot.isFetchingNextPage)return;
    const cursor=snapshot.pages.length?getNext.current(snapshot.pages.at(-1)):undefined;
    if(cursor===null||cursor===undefined)return;
    const id=requestId.current;
    setState(old=>({...old,isFetchingNextPage:true}));
    try{
      const page=await reader.current({pageParam:cursor});
      if(requestId.current===id)setState(old=>({
        ...old,pages:[...old.pages,page],error:null,isFetchingNextPage:false
      }));
    }catch(error){
      if(requestId.current===id)setState(old=>({...old,error,isFetchingNextPage:false}));
    }
  },[key,state]);
  return {data:current.key===key?{pages:current.pages}:undefined,error:current.error,
    isPending:current.isPending,isLoading:current.isPending,
    isFetchingNextPage:current.isFetchingNextPage,hasNextPage,fetchNextPage,
    refetch:start};
}
