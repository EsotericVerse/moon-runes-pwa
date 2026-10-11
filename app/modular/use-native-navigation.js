'use client';

import {useEffect,useState} from 'react';
import {Capacitor} from '@capacitor/core';

export default function useNativeNavigation(){
  const [native,setNative]=useState(false);
  useEffect(()=>{setNative(Capacitor.isNativePlatform());},[]);
  return native;
}
