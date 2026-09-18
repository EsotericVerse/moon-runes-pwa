'use client';

import {useTheme} from './ThemeProvider';

export default function ThemeControl({compact=false}){
  const {mode,setMode,active,styles}=useTheme();
  return <label className="loc-theme-control">
    {!compact&&<span>風格</span>}
    <select value={mode} onChange={event=>setMode(event.target.value)} aria-label="全站風格">
      <option value="auto">隨時間輪替（目前：{active?.name_zh||'—'}）</option>
      {styles.filter(item=>item.enabled!==false).map(style=>
        <option key={style.style_key} value={style.style_key}>
          {style.name_zh}{style.style_key==='soul'?'（永夜）':style.style_key==='order'?'（永日）':''}
        </option>
      )}
    </select>
  </label>;
}
