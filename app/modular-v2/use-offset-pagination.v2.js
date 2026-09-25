'use client';

import {useCallback,useEffect,useRef,useState} from 'react';

export function useOffsetPagination({key,pageSize,loadPage,enabled=true}){
  const [rows,setRows]=useState([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState(null);
  const [hasMore,setHasMore]=useState(true);
  const offsetRef=useRef(0);
  const busyRef=useRef(false);
  const hasMoreRef=useRef(true);
  const requestIdRef=useRef(0);
  const loadPageRef=useRef(loadPage);
  loadPageRef.current=loadPage;

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
      const nextRows=page.rows||[];
      offsetRef.current=offset+nextRows.length;
      hasMoreRef.current=Boolean(page.hasMore);
      setRows(current=>[...current,...nextRows]);
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
      return ()=>{
        if(requestId===requestIdRef.current)requestIdRef.current+=1;
      };
    }
    busyRef.current=true;
    setLoading(true);
    Promise.resolve().then(()=>loadPageRef.current(0,pageSize)).then(page=>{
      if(requestId!==requestIdRef.current)return;
      const firstRows=page.rows||[];
      offsetRef.current=firstRows.length;
      hasMoreRef.current=Boolean(page.hasMore);
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
    return ()=>{
      if(requestId===requestIdRef.current)requestIdRef.current+=1;
    };
  },[enabled,key,pageSize]);

  useEffect(()=>{
    const loadAtPageEnd=()=>{
      if(error)return;
      const pageBottom=window.scrollY+window.innerHeight;
      const documentBottom=document.documentElement.scrollHeight;
      if(pageBottom>=documentBottom-160)loadNext();
    };
    window.addEventListener('scroll',loadAtPageEnd,{passive:true});
    loadAtPageEnd();
    return ()=>window.removeEventListener('scroll',loadAtPageEnd);
  },[loadNext,rows.length,hasMore,loading,error]);

  return {rows,loading,error,hasMore};
}
