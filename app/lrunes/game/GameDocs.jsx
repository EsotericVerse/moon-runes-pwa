'use client';

import {useState} from 'react';
import {Alert,Chip,Divider,Paper,Stack,TextField,Typography} from '@mui/material';

// The rules catalog is only needed when the player opens a documentation tab.
// Next.js isolates this from the hot 3D tabletop render path.
const RULE_SECTIONS=Object.freeze([
  {id:'identity',title:'遊戲定位／核心流程',codes:['IDENTITY','CORE_LOOP']},
  {id:'player-de',title:'玩家／De',codes:['PLAYER_MIN','PLAYER_MAX','DE_MIN','DE_MAX']},
  {id:'hand',title:'起手／手牌',codes:['OPENING_DRAW','OPENING_DISCARD','HAND_BASE','HAND_TEMP_CAP']},
  {id:'event',title:'Event',codes:['EVENT_RESPONSE_CARDS','EVENT_DRAW','FAIL_DRAW','EVENT_RESULT']},
  {id:'resonance',title:'Resonance',codes:['RESONANCE_SELF','RESONANCE_ATTACK']},
  {id:'round',title:'回合',codes:['ROUND_PHASE','TIE_DUEL']},
  {id:'ownership',title:'牌卡所有權',codes:['OWNERSHIP']}
]);

function RuleRow({row}){
  const meta=[
    row.rule_round_no?('第 '+row.rule_round_no+' 回合'):null,
    row.rule_result_code?row.rule_result_code:null,
    row.rule_value_text||null,
    row.rule_de_delta!==null&&row.rule_de_delta!==undefined?('De '+(row.rule_de_delta>0?'+':'')+row.rule_de_delta):null,
    row.rule_draw_count!==null&&row.rule_draw_count!==undefined?('補 '+row.rule_draw_count+' 張'):null
  ].filter(Boolean);
  return <div className="lrg-rule-row">
    <div className="lrg-rule-row-main">
      <Typography fontWeight={800}>{row.rule_title}</Typography>
      <Typography variant="body2" color="text.secondary">{row.rule_text}</Typography>
    </div>
    {meta.length?<Stack direction="row" gap={.75} flexWrap="wrap" justifyContent="flex-end">
      {meta.map(item=><Chip key={item} size="small" variant="outlined" label={item}/>)}
    </Stack>:null}
  </div>;
}

function RuleSections({data,query,category}){
  const normalized=query.trim().toLocaleLowerCase('zh-Hant');
  const matches=(...parts)=>!normalized||parts.filter(value=>value!==null&&value!==undefined).join(' ').toLocaleLowerCase('zh-Hant').includes(normalized);
  const inCategory=row=>category==='all'
    ||(category==='other'?!RULE_SECTIONS.some(group=>group.codes.includes(row.rule_code))
      :RULE_SECTIONS.find(group=>group.id===category)?.codes.includes(row.rule_code));
  const visibleRules=data.rules.filter(row=>inCategory(row)&&matches(
    row.rule_code,row.rule_title,row.rule_text,row.rule_phase,row.rule_result_code,row.rule_value_text,row.rule_round_no
  ));
  const groups=[
    ...RULE_SECTIONS.map(section=>({...section,rows:visibleRules.filter(row=>section.codes.includes(row.rule_code))})),
    {id:'other',title:'其他規則',rows:visibleRules.filter(row=>!RULE_SECTIONS.some(group=>group.codes.includes(row.rule_code)))}
  ].filter(section=>section.rows.length);
  const macros=(category==='all'||category==='macros')?data.macros.filter(row=>
    matches(row.code,row.title,row.description,row.groupA,row.groupB)):[];

  return <div className="lrg-rule-sections">
    {groups.map(section=><Paper component="section" variant="outlined" className="lrg-rule-section" key={section.id}>
      <Typography variant="h6" component="h3">{section.title}</Typography>
      <Divider/>
      <div className="lrg-rule-list">
        {section.rows.map(row=><RuleRow row={row} key={row.game_key}/>)}
      </div>
    </Paper>)}

    {macros.length?<Paper component="section" variant="outlined" className="lrg-rule-section">
      <Typography variant="h6" component="h3">四組簡稱</Typography>
      <Divider/>
      <div className="lrg-rule-list">
        {macros.map(row=><div className="lrg-rule-row" key={row.code}>
          <div className="lrg-rule-row-main">
            <Typography fontWeight={800}>{row.code}｜{row.title}</Typography>
            <Typography variant="body2" color="text.secondary">{row.description}</Typography>
          </div>
          <Chip size="small" variant="outlined" label={row.groupA+'＋'+row.groupB}/>
        </div>)}
      </div>
    </Paper>:null}

    {!groups.length&&!macros.length?<Alert severity="info">沒有符合的規則。</Alert>:null}
  </div>;
}

function DocumentCategories({categories,selected,onSelect}){
  return <div className="lrg-doc-categories" role="group" aria-label="文件分類">
    {categories.map(item=><button type="button" className="lrg-doc-category" key={item.value}
      aria-pressed={selected===item.value} onClick={()=>onSelect(item.value)}>
      <span className="lrg-doc-category-title">{item.label}</span>
      <span className="lrg-doc-category-count">{item.count} 筆</span>
    </button>)}
  </div>;
}

export default function GameDocs({data,section,fullRequirement}){
  const [query,setQuery]=useState('');
  const [category,setCategory]=useState('');
  const normalized=query.trim().toLocaleLowerCase('zh-Hant');
  const matches=(...parts)=>!normalized||parts.filter(Boolean).join(' ').toLocaleLowerCase('zh-Hant').includes(normalized);

  const roleGroups=[...new Set(data.roles.map(role=>role.group).filter(Boolean))];
  const missingGroup='__unassigned__';
  const eventGroups=[...new Set(data.events.flatMap(event=>event.groups.length?event.groups:[missingGroup]))];
  const actionGroups=[...new Set(data.runeActions.map(action=>action.group||missingGroup))];
  const orderedGroups=groups=>[
    ...roleGroups.filter(group=>groups.includes(group)),
    ...groups.filter(group=>!roleGroups.includes(group))
  ];
  const unknownRules=data.rules.filter(rule=>!RULE_SECTIONS.some(group=>group.codes.includes(rule.rule_code)));
  const categories=section==='rules'?[
    ...RULE_SECTIONS.map(group=>({
      value:group.id,label:group.title,
      count:data.rules.filter(rule=>group.codes.includes(rule.rule_code)).length
    })).filter(item=>item.count),
    ...(unknownRules.length?[{value:'other',label:'其他規則',count:unknownRules.length}]:[]),
    ...(data.macros.length?[{value:'macros',label:'四組簡稱',count:data.macros.length}]:[])
  ]:section==='events'?orderedGroups(eventGroups).map(group=>({
    value:group,label:group===missingGroup?'未分組':group,
    count:data.events.filter(event=>group===missingGroup?!event.groups.length:event.groups.includes(group)).length
  })):section==='actions'?orderedGroups(actionGroups).map(group=>({
    value:group,label:group===missingGroup?'未分組':group,
    count:data.runeActions.filter(action=>(action.group||missingGroup)===group).length
  })):[];
  const allCount=section==='rules'?data.rules.length+data.macros.length
    :section==='events'?data.events.length:data.runeActions.length;
  const choices=categories.length?[...categories,{value:'all',label:'全部項目',count:allCount}]:[];
  const selectedCategory=choices.find(item=>item.value===category);
  const events=data.events.filter(row=>(category==='all'||(category===missingGroup?!row.groups.length:row.groups.includes(category)))
    &&matches(row.id,row.name,row.description,row.requirement,...row.groups));
  const roles=data.roles.filter(row=>matches(row.group,row.name,row.focus,row.mode,row.intervention,row.tool,row.tagline));
  const actions=data.runeActions.filter(row=>(category==='all'||(row.group||missingGroup)===category)
    &&matches(row.name,row.group,row.text,row.kind,row.value));
  const labels={
    rules:['遊戲規則','依主題章節查閱遊戲條文與四組簡稱'],
    events:['事件卡 · '+data.events.length,'依事件所屬群組查閱；雙群組事件會出現在相關兩組'],
    roles:['八職 · '+data.roles.length,'職業定位、介入與工具'],
    actions:['符文行動 · '+data.runeActions.length,'依符文群組查閱各符文的遊戲行動效果']
  };
  const [title,description]=labels[section]||labels.rules;

  return <Paper component="section" className="lrg-docs">
    <div className="lrg-doc-heading">
      <Typography variant="h5" component="h2" fontWeight={700}>{title}</Typography>
      <Typography variant="body2" color="text.secondary">{description}</Typography>
    </div>
    {choices.length?<DocumentCategories categories={choices} selected={category}
      onSelect={next=>{setCategory(next);setQuery('');}}/>:null}
    {choices.length&&!selectedCategory?<Typography variant="body2" color="text.secondary">
      選擇分類，查看對應文件。
    </Typography>:null}
    {(!choices.length||selectedCategory)?<>
      {selectedCategory?<Typography variant="subtitle1" component="h3" fontWeight={700}>
        {selectedCategory.label} · {selectedCategory.count} 筆
      </Typography>:null}
      <TextField size="small" label="搜尋目前分類" value={query}
        onChange={event=>setQuery(event.target.value)} sx={{width:{xs:'100%',sm:'min(100%,360px)'}}}/>
      <Divider/>
      {section==='rules'?<RuleSections data={data} query={query} category={category}/>:null}
      {section==='events'?<div className="lrg-doc-grid">{events.map(row=><Paper variant="outlined" className="lrg-doc-item" key={row.id}><Stack direction="row" spacing={1} flexWrap="wrap"><Chip size="small" label={row.id}/>{row.groups.map(group=><Chip size="small" variant="outlined" key={group} label={group}/>)}</Stack><Typography fontWeight={800} sx={{mt:1}}>{row.name}</Typography><Typography variant="body2">{row.description}</Typography><Typography variant="caption" color="text.secondary">條件：{fullRequirement(data,row.requirement)}</Typography></Paper>)}</div>:null}
      {section==='roles'?<div className="lrg-doc-grid">{roles.map(role=><Paper variant="outlined" className="lrg-doc-item" key={role.id}><Chip size="small" label={role.group}/><Typography fontWeight={800} sx={{mt:1}}>{role.name}</Typography><Typography variant="body2">{role.focus}</Typography><Typography variant="body2" color="text.secondary">{[role.mode,role.intervention,role.tool].filter(Boolean).join('｜')}</Typography><Typography variant="caption">{role.tagline}</Typography></Paper>)}</div>:null}
      {section==='actions'?<div className="lrg-doc-grid">{actions.map(action=><Paper variant="outlined" className="lrg-doc-item" key={action.runeId}><Stack direction="row" spacing={1}><Chip size="small" label={String(action.runeId).padStart(2,'0')}/><Chip size="small" variant="outlined" label={action.group}/></Stack><Typography fontWeight={800} sx={{mt:1}}>{action.name}</Typography><Typography variant="body2">{action.text}</Typography>{action.kind?<Typography variant="caption" color="text.secondary">{action.kind}{action.value!==null?' '+action.value:''}</Typography>:null}</Paper>)}</div>:null}
      {((section==='events'&&!events.length)||(section==='roles'&&!roles.length)||(section==='actions'&&!actions.length))?<Alert severity="info">沒有符合的資料。</Alert>:null}
    </>:null}
  </Paper>;
}

