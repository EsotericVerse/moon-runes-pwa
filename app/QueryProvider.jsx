'use client';

import {useState} from 'react';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';

function shouldRetryQuery(failureCount,error){
  const cause=error?.cause||error;
  const message=String(cause?.message||error?.message||'').toLowerCase();
  if(cause?.status===429||/too many requests|rate.?limit|\b429\b/.test(message))return false;
  return failureCount<1;
}

export default function QueryProvider({children}){
  const [client]=useState(()=>new QueryClient({
    defaultOptions:{
      queries:{
        staleTime:30_000,
        retry:shouldRetryQuery,
        refetchOnWindowFocus:false
      }
    }
  }));
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
