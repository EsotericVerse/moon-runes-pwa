export default function BottomNavIcon({name}){
  const common={width:23,height:23,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.8,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true};
  if(name==='home')return <svg {...common}><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/></svg>;
  if(name==='culture')return <svg {...common}><path d="M6 3h12M6 21h12M8 3v4c0 3 4 4 4 5s-4 2-4 5v4M16 3v4c0 3-4 4-4 5s4 2 4 5v4"/><path d="m9 9 3 3 3-3M9 18h6"/></svg>;
  if(name==='statics')return <svg {...common}><path d="M4 20V10h4v10M10 20V4h4v16M16 20v-7h4v7M3 20h18"/></svg>;
  if(name==='search')return <svg {...common}><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg>;
  if(name==='governance')return <svg {...common}><path d="M12 3v17M4 7h16M7 7 3 14h8L7 7ZM17 7l-4 7h8l-4-7ZM8 21h8"/></svg>;
  return <svg {...common}><path d="M10.5 2.8h3l.5 2.3 1.7.7 2-1.3 2.1 2.1-1.3 2 .7 1.7 2.3.5v3l-2.3.5-.7 1.7 1.3 2-2.1 2.1-2-1.3-1.7.7-.5 2.3h-3l-.5-2.3-1.7-.7-2 1.3-2.1-2.1 1.3-2-.7-1.7-2.3-.5v-3l2.3-.5.7-1.7-1.3-2 2.1-2.1 2 1.3 1.7-.7z"/><circle cx="12" cy="12" r="3"/></svg>;
}
