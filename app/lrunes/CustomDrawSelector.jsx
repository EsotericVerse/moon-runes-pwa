'use client';

export default function CustomDrawSelector({options=[]}){
  return <div className="scope-stat-controls runes-custom-draw-selector">
    <label>
      <span>指定抽牌數量</span>
      <select
        className="scope-select"
        defaultValue=""
        aria-label="指定抽牌數量"
        onChange={event=>{
          const href=event.target.value;
          if(href)window.location.assign(href);
        }}
      >
        <option value="" disabled>選擇張數</option>
        {options.map(item=><option key={item.count} value={item.href}>{item.count} 張｜{item.description}</option>)}
      </select>
    </label>
  </div>;
}
