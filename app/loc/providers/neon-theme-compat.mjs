const legacyColumns=new Set(['theme_id','theme_name','theme_order','theme_attr']);
const themeColumns=new Set([
  'theme_id','theme_name','theme_order','scheme','style_key','identity_color',
  'loc_bg','loc_panel','loc_panel_2','loc_panel_strong','loc_panel_nav','loc_panel_tab','loc_rune_bg','loc_rune_selected_bg',
  'loc_line','loc_line_soft','loc_line_softer','loc_line_faint','loc_text','loc_muted','loc_heading','loc_accent','loc_gold','loc_danger',
  'loc_surface','loc_surface_soft','loc_surface_faint','loc_surface_status','loc_accent_surface','loc_accent_surface_strong',
  'loc_accent_border','loc_accent_border_soft','loc_accent_border_faint','loc_gold_surface','loc_gold_surface_soft',
  'loc_gold_border','loc_gold_border_soft','loc_gold_border_faint','loc_gold_ring','loc_gold_ring_soft','loc_danger_border',
  'loc_primary_start','loc_primary_end','loc_body_glow','loc_body_mid','loc_hero_start','loc_hero_end','loc_shadow','loc_shadow_card'
]);

function legacyThemeId(value){
  const number=Number(String(value).replace(/^theme-/,''));
  if(!Number.isInteger(number)||number<1||number>8)throw new Error('Invalid LOC theme identifier');
  return `theme-${number}`;
}

export function adaptNeonThemeRequest(input){
  if(input?.schema!=='silver'||input?.table!=='loc_theme')return null;
  if(input.operation!=='select')throw new Error('Neon theme mirror is read-only');
  const request={...input};
  request.filters=(input.filters||[]).map(filter=>{
    if(filter.column==='theme_id')return {...filter,value:filter.operator==='in'?filter.value.map(legacyThemeId):legacyThemeId(filter.value)};
    if(!['theme_name','theme_order'].includes(filter.column))throw new Error('Unsupported legacy Neon theme filter');
    return filter;
  });
  if(input.or?.length)throw new Error('OR filters are not supported for the legacy Neon theme mirror');
  if((input.columns||[]).some(column=>column!=='*'&&!themeColumns.has(column)))throw new Error('Unsupported LOC theme column');
  if((input.orders||[]).some(order=>!['theme_id','theme_order','theme_name'].includes(order.column)))throw new Error('Unsupported LOC theme ordering');
  request.columns=[...legacyColumns];
  request.or=[];
  return {request,columns:input.columns?.length?input.columns:['*']};
}

export function normalizeNeonThemeRows(data,columns=['*']){
  const requested=columns.includes('*')?[...themeColumns]:columns;
  const normalize=row=>{
    if(!row)return row;
    const attrs=row.theme_attr&&typeof row.theme_attr==='object'?row.theme_attr:{};
    const tokens=attrs.tokens&&typeof attrs.tokens==='object'?attrs.tokens:{};
    const normalized={};
    for(const column of requested){
      if(column==='theme_id')normalized[column]=Number(String(row.theme_id).replace(/^theme-/,''));
      else if(column==='theme_name')normalized[column]=row.theme_name??attrs.group??null;
      else if(column==='theme_order')normalized[column]=row.theme_order;
      else if(column==='scheme'||column==='style_key'||column==='identity_color')normalized[column]=attrs[column]??null;
      else normalized[column]=tokens[`--${column.replaceAll('_','-')}`]??null;
    }
    return normalized;
  };
  return Array.isArray(data)?data.map(normalize):normalize(data);
}
