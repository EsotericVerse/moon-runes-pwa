'use client';

/** Visible in-page navigation for management workspaces. */
export default function ManagementSectionNav({
  id,
  title,
  panelId,
  items,
  value,
  onChange
}){
  const activeItem=items.find(item=>item.value===value)||items[0];
  const headingId=id+'-heading';

  return <section className="management-section-nav" aria-labelledby={headingId}>
    <h2 className="management-section-nav__title" id={headingId}>{title}</h2>
    <div className="management-section-nav__items" role="group" aria-label={title}>
      {items.map(item=>{
        const selected=item.value===activeItem?.value;
        const itemId=id+'-option-'+item.value;
        return <button
          key={item.value}
          id={itemId}
          type="button"
          className="management-section-nav__item"
          aria-pressed={selected}
          aria-controls={panelId}
          onClick={()=>onChange(item.value)}
        >
          <span className="management-section-nav__label">{item.label}</span>
          {item.description?<span className="management-section-nav__description">{item.description}</span>:null}
        </button>;
      })}
    </div>
  </section>;
}
