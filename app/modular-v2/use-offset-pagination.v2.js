'use client';

import {useCallback,useEffect,useRef,useState} from 'react';
import {DEFAULT_LIST_BATCH_SIZE} from '../loc/list-loading-contract.mjs';

function appendUnique(current,next,getRowKey){
  if(typeof getRowKey!=='function')return [...current,...next];
  const map=new Map(current.map((row,index)=>[getRowKey(row,index),row]));
  next.forEach((row,index)=>map.set(getRowKey(row,current.length+index),row));
  return [...map.values()];
}

export function useOffsetPagination({
  key,
  pageSize=DEFAULT_LIST_BATCH_SIZE,
  loadPage,
  enabled=true,
  getRowKey=null
}){
  const [rows,setRows]=useState([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState(null);
  const [hasMore,setHasMore]=useState(true);
  const [reloadKey,setReloadKey]=useState(0);
  const offsetRef=useRef(0);
  const busyRef=useRef(false);
  const hasMoreRef=useRef(true);
  const requestIdRef=useRef(0);
  const loadPageRef=useRef(loadPage);
  const getRowKeyRef=useRef(getRowKey);
  loadPageRef.current=loadPage;
  getRowKeyRef.current=getRowKey;

  const loadNext=useCallback(async()=>{
    if(!enabled||busyRef.current||!hasMoreRef.current)return;
    busyRef.current=true;
    setLoading(true);
    setError(null);
    const requestId=requestIdRef.current;
    const offset=offsetRef.current;
    try{
      const page=await loadPageRef.current(offset,pageSize);
      if(requestId!==requestIdRef.current)return;
      const nextRows=Array.isArray(page?.rows)?page.rows:[];
      offsetRef.current=page?.nextCursor??(Number.isFinite(Number(page?.nextOffset))?Number(page.nextOffset):Number(offset||0)+nextRows.length);
      hasMoreRef.current=typeof page?.hasMore==='boolean'?page.hasMore:nextRows.length===pageSize;
      setRows(current=>appendUnique(current,nextRows,getRowKeyRef.current));
      setHasMore(hasMoreRef.current);
    }catch(nextError){
      if(requestId===requestIdRef.current)setError(nextError);
    }finally{
      if(requestId===requestIdRef.current){
        busyRef.current=false;
        setLoading(false);
      }
    }
  },[enabled,pageSize]);

  useEffect(()=>{
    const requestId=++requestIdRef.current;
    busyRef.current=false;
    offsetRef.current=0;
    hasMoreRef.current=true;
    setRows([]);
    setHasMore(true);
    setError(null);
    if(!enabled){
      setLoading(false);
      return ()=>{if(requestId===requestIdRef.current)requestIdRef.current+=1;};
    }
    busyRef.current=true;
    setLoading(true);
    Promise.resolve().then(()=>loadPageRef.current(0,pageSize)).then(page=>{
      if(requestId!==requestIdRef.current)return;
      const firstRows=Array.isArray(page?.rows)?page.rows:[];
      offsetRef.current=page?.nextCursor??(Number.isFinite(Number(page?.nextOffset))?Number(page.nextOffset):firstRows.length);
      hasMoreRef.current=typeof page?.hasMore==='boolean'?page.hasMore:firstRows.length===pageSize;
      setRows(firstRows);
      setHasMore(hasMoreRef.current);
    }).catch(nextError=>{
      if(requestId===requestIdRef.current)setError(nextError);
    }).finally(()=>{
      if(requestId===requestIdRef.current){
        busyRef.current=false;
        setLoading(false);
      }
    });
    return ()=>{if(requestId===requestIdRef.current)requestIdRef.current+=1;};
  },[enabled,key,pageSize,reloadKey]);

  const reload=useCallback(()=>setReloadKey(value=>value+1),[]);
  return {rows,loading,error,hasMore,loadNext,reload};
}
