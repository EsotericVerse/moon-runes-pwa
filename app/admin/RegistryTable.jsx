export default function RegistryTable({title,description,columns,rows=[]}){
  return <section className="loc-panel">
    <header>
      <p className="loc-eyebrow">Registry</p>
      <h2>{title}</h2>
      {description?<p>{description}</p>:null}
    </header>
    {rows.length===0?<p>目前沒有正式資料列。</p>:<div className="loc-table-wrap"><table><thead><tr>{columns.map(column=><th key={column.key}>{column.label}</th>)}</tr></thead><tbody>{rows.map((row,index)=><tr key={row.id||row.event_id||row.source_id||row.content_id||row.actor_id||row.scope||index}>{columns.map(column=>{
      const value=row[column.key];
      const text=Array.isArray(value)?value.join('、'):value&&typeof value==='object'?JSON.stringify(value):String(value??'');
      return <td key={column.key}>{text}</td>;
    })}</tr>)}</tbody></table></div>}
  </section>;
}
