'use client';
import {useEffect,useRef} from 'react';
export default function LegacyHtml({html}){const ref=useRef(null);useEffect(()=>{const root=ref.current;if(!root)return;const scripts=[...root.querySelectorAll('script')];for(const old of scripts){const s=document.createElement('script');for(const a of old.attributes)s.setAttribute(a.name,a.value);s.text=old.textContent||'';old.replaceWith(s);}return()=>{};},[]);return <div ref={ref} dangerouslySetInnerHTML={{__html:html}}/>;}
