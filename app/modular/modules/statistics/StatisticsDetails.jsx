'use client';
import {useState} from 'react';
import UiText from '../../../i18n/UiText';

export default function StatisticsDetails({children}){
  const [open,setOpen]=useState(false);
  return <details className="scope-stat-details" onToggle={event=>setOpen(event.currentTarget.open)}>
    <summary><UiText id="uiExtra.statisticsView.viewDetails"/></summary>
    {open?children():null}
  </details>;
}
