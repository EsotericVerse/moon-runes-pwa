'use client';
import {useEffect,useState} from 'react';
import RuneDrawClient from '../RuneDrawClient';
export default function DuelModePage({mode}){const [ready,setReady]=useState(false);useEffect(()=>{const url=new URL(window.location.href);url.searchParams.set('mode',mode);window.history.replaceState({},'',`${url.pathname}${url.search}`);setReady(true);},[mode]);return ready?<RuneDrawClient/>:<div className="loc-loading">載入抽牌模式…</div>;}
