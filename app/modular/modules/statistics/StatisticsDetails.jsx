'use client';
import {useState} from 'react';
import UiText from '../../../i18n/UiText';

export default function StatisticsDetails({children,summary=null,className='scope-stat-details'}){
  const [open,setOpen]=useState(false);
  return <details className={className} onToggle={event=>setOpen(event.currentTarget.open)}>
    <summary>{summary??<UiText id="uiExtra.statisticsView.viewDetails"/>}</summary>
    {open?(typeof children==='function'?children():children):null}
  </details>;
}
