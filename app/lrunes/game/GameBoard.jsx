'use client';

import {useEffect,useMemo,useState} from 'react';
import {Client} from 'boardgame.io/react';
import {useQuery} from '@tanstack/react-query';
import {
  Alert,Box,Button,Chip,Divider,FormControl,InputLabel,LinearProgress,MenuItem,
  Paper,Select,Stack,Tab,Tabs,TextField,ThemeProvider,Typography,createTheme
} from '@mui/material';
import {DndContext,PointerSensor,TouchSensor,useDraggable,useDroppable,useSensor,useSensors} from '@dnd-kit/core';
import {CartesianGrid,Legend,Line,LineChart,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts';
import {createLunaRunesGame} from './boardgame-rules.js';
import {loadGameData} from './game-data.js';
import gameHeroAsset from '../../../pics/LunaRunesGame.jpg';
import './game-board.css';

const LABELS=['A','B','C','D'];
const FALLBACK_THEME={
  mode:'dark',bg:'#101623',panel:'#1a2434',panel2:'#25334a',
  text:'#f4f1e9',muted:'#c1ccdd',heading:'#f4f1e9',
  accent:'#e4bf7c',gold:'#e4bf7c',line:'#34435b',danger:'#c66f7e'
};

function readLocTheme(){
  if(typeof document==='undefined')return FALLBACK_THEME;
  const root=document.documentElement;
  const css=getComputedStyle(root);
  const token=(name,fallback)=>css.getPropertyValue(name).trim()||fallback;
  return {
    mode:root.dataset.theme==='light'?'light':'dark',
    bg:token('--loc-bg',FALLBACK_THEME.bg),
    panel:token('--loc-panel',FALLBACK_THEME.panel),
    panel2:token('--loc-panel-2',FALLBACK_THEME.panel2),
    text:token('--loc-text',FALLBACK_THEME.text),
    muted:token('--loc-muted',FALLBACK_THEME.muted),
    heading:token('--loc-heading',FALLBACK_THEME.heading),
    accent:token('--loc-accent',FALLBACK_THEME.accent),
    gold:token('--loc-gold',FALLBACK_THEME.gold),
    line:token('--loc-line',FALLBACK_THEME.line),
    danger:token('--loc-danger',FALLBACK_THEME.danger)
  };
}

function buildGameTheme(tokens){
  return createTheme({
    palette:{
      mode:tokens.mode,
      primary:{main:tokens.accent},
      secondary:{main:tokens.gold},
      error:{main:tokens.danger},
      background:{default:tokens.bg,paper:tokens.panel},
      text:{primary:tokens.text,secondary:tokens.muted},
      divider:tokens.line
    },
    shape:{borderRadius:12},
    typography:{fontFamily:'system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'},
    components:{
      MuiButton:{defaultProps:{disableElevation:true}},
      MuiPaper:{defaultProps:{elevation:0},styleOverrides:{root:{backgroundImage:'none'}}},
      MuiChip:{styleOverrides:{root:{fontWeight:650}}}
    }
  });
}

function useLocGameTheme(){
  const [tokens,setTokens]=useState(FALLBACK_THEME);
  useEffect(()=>{
    const root=document.documentElement;
    const sync=()=>setTokens(readLocTheme());
    sync();
    const observer=new MutationObserver(sync);
    observer.observe(root,{attributes:true,attributeFilter:['style','data-theme','data-theme-id']});
    return()=>observer.disconnect();
  },[]);
  return useMemo(()=>buildGameTheme(tokens),[tokens]);
}

const cardSrc=card=>'/assets/lunarunes/cards/'+String(card.id).padStart(2,'0')+'_'+String(card.name).replace(/之符文$/,'').trim()+'.png';
const labelStage=s=>s==='opening'?'起手棄牌':s==='event'?'事件':s==='duel'?'決鬥':s==='finished'?'結算':String(s||'').includes('resonance')?'共鳴':s||'—';
const samePair=(a,b,x,y)=>(a===x&&b===y)||(a===y&&b===x);

function eventVisual(data,event){
  const groups=event?.groups||[];
  if(groups.length===2){
    const pair=data.eventVisuals.find(item=>samePair(item.group,item.group2,groups[0],groups[1]));
    if(pair)return pair;
  }
  return data.groupAssets.find(item=>groups.includes(item.group))||null;
}

function fullRequirement(data,requirement=''){
  const macroMap=new Map((data.macros||[]).map(item=>[
    item.code,
    item.description||[item.groupA,item.groupB].filter(Boolean).join('＋')||item.title||item.code
  ]));
  return String(requirement||'')
    .split('+')
    .map(code=>macroMap.get(code.trim())||code.trim())
    .filter(Boolean)
    .join('／');
}

function EventScoringHelp({data}){
  const results=Array.from(data.resultByCoverage?.entries?.()||[])
    .sort((a,b)=>b[0]-a[0]);
  return <Paper variant="outlined" className="lrg-scoring-help">
    <Typography fontWeight={800}>Event 最高 4 分，這樣計算：</Typography>
    <ol>
      <li>第一張符文的群組符合事件條件：+1</li>
      <li>第二張符文的群組符合事件條件：+1</li>
      <li>兩張回應牌中至少出現 1 種符文群組：+1</li>
      <li>兩張符文來自不同群組：再 +1</li>
    </ol>
    <Typography variant="caption" color="text.secondary">結果依目前規則資料：</Typography>
    <Stack direction="row" gap={.75} flexWrap="wrap" sx={{mt:.75}}>
      {results.map(([score,result])=><Chip
        key={score}
        size="small"
        variant="outlined"
        label={score+'/4 '+result.label+' · De '+(result.delta>0?'+':'')+result.delta+' · 補 '+result.drawCount+' 張'}
      />)}
    </Stack>
  </Paper>;
}



function RuneCard({card,selected,disabled,onClick,playerIndex}){
  const {attributes,listeners,setNodeRef,transform,isDragging}=useDraggable({
    id:'rune-'+playerIndex+'-'+card.id,
    disabled,
    data:{playerIndex,cardId:card.id}
  });
  return <button
    ref={setNodeRef}
    type="button"
    {...attributes}
    {...listeners}
    className={'lrg-card'+(selected?' picked':'')}
    aria-pressed={selected}
    disabled={disabled}
    onClick={onClick}
    title={card.name+'｜'+card.group+(card.action?'｜'+card.action:'')}
    style={{
      transform:transform?'translate3d('+transform.x+'px,'+transform.y+'px,0)':undefined,
      opacity:isDragging?.58:1,
      zIndex:isDragging?10:undefined
    }}
  >
    <img src={cardSrc(card)} alt={card.name+'符文卡'} loading="lazy"/>
    <span><b>{String(card.id).padStart(2,'0')} {card.name}</b><small>{card.group}</small></span>
  </button>;
}

function SelectionZone({count,limit,playerIndex}){
  const {setNodeRef,isOver}=useDroppable({id:'selected-zone-'+playerIndex,data:{playerIndex}});
  return <Paper
    ref={setNodeRef}
    variant="outlined"
    className="lrg-dropzone"
    sx={{
      p:1.25,mt:1,borderStyle:'dashed',
      borderColor:isOver?'primary.main':'divider',
      bgcolor:isOver?'var(--loc-accent-surface,rgba(228,191,124,.10))':'transparent'
    }}
  >
    <Typography variant="body2">已選 {count} / {limit} 張 · 點擊卡牌，或拖曳至此選取</Typography>
  </Paper>;
}

function DeTrend({history,players}){
  if((history||[]).length<2)return <Alert severity="info">完成第一個遊戲行動後會開始顯示 De 軌跡。</Alert>;
  return <Paper className="lrg-history-panel">
    <Typography variant="h6" component="h2">De 軌跡</Typography>
    <div className="lrg-trend">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={history} margin={{top:12,right:16,bottom:8,left:-12}}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--loc-line,#34435b)"/>
          <XAxis dataKey="step" tick={{fill:'var(--loc-muted,#c1ccdd)'}} stroke="var(--loc-line,#34435b)"/>
          <YAxis allowDecimals={false} tick={{fill:'var(--loc-muted,#c1ccdd)'}} stroke="var(--loc-line,#34435b)"/>
          <Tooltip contentStyle={{background:'var(--loc-panel,#1a2434)',border:'1px solid var(--loc-line,#34435b)',color:'var(--loc-text,#f4f1e9)',borderRadius:8}}/>
          <Legend/>
          {players.map((player,index)=><Line key={player.name} type="monotone" dataKey={LABELS[index]} name={player.name} stroke={['var(--loc-accent,#e4bf7c)','var(--loc-gold,#e4bf7c)','var(--loc-heading,#f4f1e9)','var(--loc-danger,#c66f7e)'][index]} strokeWidth={2.5} dot={{r:3}} isAnimationActive={false}/>)}
        </LineChart>
      </ResponsiveContainer>
    </div>
  </Paper>;
}

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

function RuleSections({data,query}){
  const normalized=query.trim().toLocaleLowerCase('zh-Hant');
  const matches=(...parts)=>!normalized||parts.filter(value=>value!==null&&value!==undefined).join(' ').toLocaleLowerCase('zh-Hant').includes(normalized);
  const visibleRules=data.rules.filter(row=>matches(
    row.rule_code,row.rule_title,row.rule_text,row.rule_phase,row.rule_result_code,row.rule_value_text,row.rule_round_no
  ));
  const groups=RULE_SECTIONS.map(section=>({
    ...section,
    rows:visibleRules.filter(row=>section.codes.includes(row.rule_code))
  })).filter(section=>section.rows.length);

  const macros=data.macros.filter(row=>matches(row.code,row.title,row.description,row.groupA,row.groupB));

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

function DocsPanel({data}){
  const [section,setSection]=useState('rules');
  const [query,setQuery]=useState('');
  const normalized=query.trim().toLocaleLowerCase('zh-Hant');
  const matches=(...parts)=>!normalized||parts.filter(Boolean).join(' ').toLocaleLowerCase('zh-Hant').includes(normalized);

  const events=data.events.filter(row=>matches(row.id,row.name,row.description,row.requirement,...row.groups));
  const roles=data.roles.filter(row=>matches(row.group,row.name,row.focus,row.mode,row.intervention,row.tool,row.tagline));
  const actions=data.runeActions.filter(row=>matches(row.name,row.group,row.text,row.kind,row.value));

  return <Paper className="lrg-docs">
    <Stack direction={{xs:'column',sm:'row'}} spacing={1.5} justifyContent="space-between" alignItems={{sm:'center'}}>
      <Tabs value={section} onChange={(_,value)=>setSection(value)} variant="scrollable" scrollButtons="auto" aria-label="遊戲資料">
        <Tab value="rules" label="規則"/>
        <Tab value="events" label={'事件 '+data.events.length}/>
        <Tab value="roles" label={'八職 '+data.roles.length}/>
        <Tab value="actions" label={'符文行動 '+data.runeActions.length}/>
      </Tabs>
      <TextField size="small" label="搜尋遊戲資料" value={query} onChange={event=>setQuery(event.target.value)} sx={{minWidth:{sm:220}}}/>
    </Stack>
    <Divider sx={{my:2}}/>

    {section==='rules'?<RuleSections data={data} query={query}/>:null}

    {section==='events'?<div className="lrg-doc-grid">{events.map(row=><Paper variant="outlined" className="lrg-doc-item" key={row.id}><Stack direction="row" spacing={1} flexWrap="wrap"><Chip size="small" label={row.id}/>{row.groups.map(group=><Chip size="small" variant="outlined" key={group} label={group}/>)}</Stack><Typography fontWeight={800} sx={{mt:1}}>{row.name}</Typography><Typography variant="body2">{row.description}</Typography><Typography variant="caption" color="text.secondary">條件：{fullRequirement(data,row.requirement)}</Typography></Paper>)}</div>:null}

    {section==='roles'?<div className="lrg-doc-grid">{roles.map(role=><Paper variant="outlined" className="lrg-doc-item" key={role.id}><Chip size="small" label={role.group}/><Typography fontWeight={800} sx={{mt:1}}>{role.name}</Typography><Typography variant="body2">{role.focus}</Typography><Typography variant="body2" color="text.secondary">{[role.mode,role.intervention,role.tool].filter(Boolean).join('｜')}</Typography><Typography variant="caption">{role.tagline}</Typography></Paper>)}</div>:null}

    {section==='actions'?<div className="lrg-doc-grid">{actions.map(action=><Paper variant="outlined" className="lrg-doc-item" key={action.runeId}><Stack direction="row" spacing={1}><Chip size="small" label={String(action.runeId).padStart(2,'0')}/><Chip size="small" variant="outlined" label={action.group}/></Stack><Typography fontWeight={800} sx={{mt:1}}>{action.name}</Typography><Typography variant="body2">{action.text}</Typography>{action.kind?<Typography variant="caption" color="text.secondary">{action.kind}{action.value!==null?' '+action.value:''}</Typography>:null}</Paper>)}</div>:null}

    {((section==='events'&&!events.length)||(section==='roles'&&!roles.length)||(section==='actions'&&!actions.length))?<Alert severity="info" sx={{mt:2}}>沒有符合的資料。</Alert>:null}
  </Paper>;
}

function Board({G,moves,rules,onRestart}){
  const [target,setTarget]=useState('');
  const [tab,setTab]=useState('board');
  const [showScoringHelp,setShowScoringHelp]=useState(false);
  const sensors=useSensors(
    useSensor(PointerSensor,{activationConstraint:{distance:8}}),
    useSensor(TouchSensor,{activationConstraint:{delay:180,tolerance:8}})
  );
  const active=G.players[G.active]||G.players[0];
  const event=G.eventDeck[G.eventIndex%G.eventDeck.length];
  const visual=eventVisual(rules,event);
  const opening=G.stage==='opening';
  const isEvent=G.stage==='event';
  const isResonance=String(G.stage||'').includes('resonance')||G.stage==='duel';
  const done=G.stage==='finished';
  const selectable=!done&&!isResonance;
  const players=opening?[{p:active,i:G.active}]:G.players.map((p,i)=>({p,i}));

  return <DndContext sensors={sensors} onDragEnd={({active:drag,over})=>{
      if(over?.data.current?.playerIndex===drag.data.current?.playerIndex&&drag.data.current){
        moves.toggleCard(drag.data.current.playerIndex,drag.data.current.cardId);
      }
    }}>
      <main className="lrg">
        <Paper component="header" className="lrg-top">
          <div>
            <Typography variant="overline" color="primary">LUNARUNES · TABLETOP</Typography>
            <Typography variant="h4" component="h1">月之符文</Typography>
          </div>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Chip color="primary" label={'第 '+G.round+' 回合 · '+labelStage(G.stage)}/>
            <Button variant="outlined" onClick={onRestart}>新遊戲</Button>
          </Stack>
        </Paper>

        <nav className="lrg-steps" aria-label="回合進度">
          {rules.rounds.map(r=><span key={r.round} className={r.round===G.round?'current':r.round<G.round?'past':''}>{r.round}</span>)}
          {G.round===9?<span className="current">9</span>:null}
        </nav>

        <Alert severity={done?'success':'info'} role="status" sx={{mb:1.5}}>{G.result}</Alert>

        <Tabs value={tab} onChange={(_,value)=>setTab(value)} variant="scrollable" scrollButtons="auto" aria-label="遊戲檢視">
          <Tab value="board" label="遊戲盤面"/>
          <Tab value="history" label="對局紀錄"/>
          <Tab value="docs" label="規則資料"/>
        </Tabs>

        {tab==='docs'?<DocsPanel data={rules}/>:null}

        {tab==='history'?<Stack spacing={1.5}>
          <DeTrend history={G.history} players={G.players}/>
          <Paper className="lrg-history-panel">
            <Typography variant="h6" component="h2">操作紀錄</Typography>
            <Stack divider={<Divider flexItem/>} sx={{mt:1}}>
              {G.logs.map((line,i)=><Typography key={i} variant="body2" sx={{py:.75}}>{line}</Typography>)}
            </Stack>
          </Paper>
        </Stack>:null}

        {tab==='board'?<div className="lrg-layout">
          <section className="lrg-table">
            <Paper className="lrg-field">
              {isEvent?<>
                <Stack direction={{xs:'column',sm:'row'}} spacing={2} alignItems={{sm:'center'}}>
                  {visual?.path?<figure className="lrg-event-visual"><img src={visual.path} alt={visual.title||event.name}/><figcaption>{visual.title}</figcaption></figure>:null}
                  <Box sx={{flex:1}}>
                    <Typography variant="overline" color="primary">EVENT · {event.id}</Typography>
                    <Typography variant="h5" component="h2">{event.name}</Typography>
                    <Typography sx={{mt:1}}>{event.description}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{mt:1}}>條件：{fullRequirement(rules,event.requirement)}</Typography>
                    <Stack direction="row" spacing={.5} alignItems="center" flexWrap="wrap" sx={{mt:1}}>
                      <Typography variant="body2">每位玩家選擇 {rules.config.eventResponseCards} 張符文卡回應；依符文群組是否符合事件條件判定結果。</Typography>
                      <Button
                        size="small"
                        variant="text"
                        className="lrg-help-button"
                        aria-label="查看 Event 得分計算"
                        aria-expanded={showScoringHelp}
                        onClick={()=>setShowScoringHelp(value=>!value)}
                      >(?)</Button>
                    </Stack>
                    {showScoringHelp?<EventScoringHelp data={rules}/>:null}
                  </Box>
                </Stack>
                <Button variant="contained" disabled={G.players.some(p=>p.selected.length!==rules.config.eventResponseCards)} onClick={()=>moves.resolveEvent()}>結算事件</Button>
              </>:null}

              {isResonance?<>
                <Typography variant="overline" color="primary">RESONANCE</Typography>
                <Typography variant="h5" component="h2">{G.stage==='duel'?'最終決鬥':'共鳴階段'}</Typography>
                <Typography>輪到 {active.name} 行動。</Typography>
                <Stack direction={{xs:'column',md:'row'}} spacing={1.25} alignItems={{md:'center'}}>
                  <Button variant="contained" onClick={()=>{moves.resonance('self');setTarget('');}}>自我共振 {rules.config.resonanceSelf>0?'+':''}{rules.config.resonanceSelf}</Button>
                  <FormControl size="small" sx={{minWidth:180}}>
                    <InputLabel id="resonance-target-label">目標玩家</InputLabel>
                    <Select labelId="resonance-target-label" label="目標玩家" value={target} onChange={e=>setTarget(e.target.value)}>
                      {G.players.map((p,i)=>i!==G.active?<MenuItem value={i} key={i} disabled={G.stage==='duel'&&!G.duelists.includes(i)}>{p.name}</MenuItem>:null)}
                    </Select>
                  </FormControl>
                  <Button disabled={target===''||(G.stage==='duel'&&!G.duelists.includes(Number(target)))} onClick={()=>{moves.resonance('attack',Number(target));setTarget('');}}>干擾 {rules.config.resonanceAttack}</Button>
                  {G.stage!=='duel'?<Button disabled={target===''} onClick={()=>moves.toggleCooperation(Number(target))}>建立／解除合作</Button>:null}
                </Stack>
              </>:null}

              {opening?<>
                <Typography variant="overline" color="primary">SETUP</Typography>
                <Typography variant="h5" component="h2">{active.name} 起手設定</Typography>
                <Typography>選擇 {rules.config.openingDiscard} 張棄牌，保留 {rules.config.handBase} 張。</Typography>
                <Button variant="contained" disabled={active.selected.length!==rules.config.openingDiscard} onClick={()=>moves.confirmOpening(G.active)}>確認棄牌（{active.selected.length}/{rules.config.openingDiscard}）</Button>
              </>:null}

              {done?<>
                <Typography variant="overline" color="primary">GAME OVER</Typography>
                <Typography variant="h4" component="h2">{G.winner!==null?G.players[G.winner].name+' 勝出':'平局'}</Typography>
                <Button variant="contained" onClick={onRestart}>再玩一次</Button>
              </>:null}
            </Paper>

            <div className="lrg-players">
              {players.map(({p,i})=><Paper component="section" key={i} className={'lrg-player'+(G.active===i?' active':'')}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                  <div><Typography variant="overline">PLAYER {LABELS[i]}</Typography><Typography variant="h6" component="h3">{p.name}</Typography></div>
                  <Chip color={G.active===i?'primary':'default'} label={'De '+p.de+' / '+rules.config.deMax}/>
                </Stack>
                <LinearProgress variant="determinate" value={Math.max(0,Math.min(100,p.de/rules.config.deMax*100))} sx={{my:1.25,height:8,borderRadius:2}}/>
                <Typography variant="caption" color="text.secondary">手牌 {p.hand.length} · 牌庫 {p.deck.length} · 棄牌 {p.discard.length} · 已選 {p.selected.length}</Typography>
                <div className="lrg-hand">
                  {p.hand.map(card=><RuneCard key={card.id} card={card} playerIndex={i} selected={p.selected.includes(card.id)} disabled={!selectable||(opening&&i!==G.active)} onClick={()=>moves.toggleCard(i,card.id)}/>)}
                </div>
                {!done&&!isResonance&&((opening&&i===G.active)||isEvent)?<SelectionZone playerIndex={i} count={p.selected.length} limit={opening?rules.config.openingDiscard:rules.config.eventResponseCards}/>:null}
              </Paper>)}
            </div>
          </section>

          <Paper component="aside" className="lrg-side">
            <Typography variant="h6" component="h2">對局資訊</Typography>
            <Stack direction="row" flexWrap="wrap" gap={1}>
              <Chip size="small" label={G.players.length+' 人'}/>
              <Chip size="small" label={labelStage(G.stage)}/>
              <Chip size="small" label={'行動：'+active.name}/>
            </Stack>
            <Divider/>
            <Typography variant="body2">事件牌：{Math.min(G.eventIndex+1,G.eventDeck.length)} / {G.eventDeck.length}</Typography>
            <Typography variant="body2">合作關係：{G.cooperations.length}</Typography>
            {G.lastInteraction?<Typography variant="body2">最近互動：{G.players[G.lastInteraction.from]?.name} → {G.players[G.lastInteraction.to]?.name}</Typography>:null}
            <Divider/>
            <Typography variant="subtitle2">最新紀錄</Typography>
            {G.logs.slice(0,6).map((line,i)=><Typography variant="caption" color="text.secondary" key={i}>{line}</Typography>)}
          </Paper>
        </div>:null}
      </main>
    </DndContext>;
}

export default function GameBoard(){
  const uiTheme=useLocGameTheme();
  const {data,error,isLoading}=useQuery({queryKey:['lrunes','game','current'],queryFn:loadGameData,staleTime:60000});
  const [count,setCount]=useState(2);
  const [match,setMatch]=useState(0);
  const Engine=useMemo(()=>data&&match?Client({
    game:createLunaRunesGame(data,count),
    board:props=><Board {...props} rules={data} onRestart={()=>setMatch(0)}/>,
    debug:false
  }):null,[data,count,match]);

  if(isLoading)return <ThemeProvider theme={uiTheme}><main className="lrg"><Alert severity="info">載入遊戲資料…</Alert></main></ThemeProvider>;
  if(error||!data)return <ThemeProvider theme={uiTheme}><main className="lrg"><Alert severity="error" role="alert">遊戲資料載入失敗：{error?.message||'無資料'}</Alert></main></ThemeProvider>;
  if(Engine)return <ThemeProvider theme={uiTheme}><Engine key={match}/></ThemeProvider>;

  return <ThemeProvider theme={uiTheme}>
    <main className="lrg lrg-home">
      <Paper className="lrg-home-hero">
        <div className="lrg-home-copy">
          <Typography variant="overline" color="primary">LUNARUNES · TABLETOP</Typography>
          <Typography variant="h3" component="h1">月之符文</Typography>
          <Typography color="text.secondary">以 66 枚符文、事件回應、De 與共鳴互動構成的本機多人桌遊。</Typography>
          <Stack direction="row" flexWrap="wrap" gap={1} sx={{mt:1.5}}>
            <Chip label={data.cards.length+' 枚符文'}/>
            <Chip label={data.events.length+' 張事件'}/>
            <Chip label={data.roles.length+' 職'}/>
            <Chip label={data.rounds.length+' 個正式回合＋平手決鬥'}/>
          </Stack>
        </div>
        <img className="lrg-hero-image" src={gameHeroAsset.src} alt="月之符文桌遊主視覺"/>
      </Paper>

      <Paper className="lrg-setup">
        <Typography variant="h6" component="h2">建立本機對局</Typography>
        <Typography variant="body2" color="text.secondary">同一裝置依序操作 A–D 玩家，不需要登入，也不寫入私人對局資料。</Typography>
        <Stack direction={{xs:'column',sm:'row'}} spacing={1.5} alignItems={{sm:'center'}} sx={{mt:2}}>
          <FormControl size="small" sx={{minWidth:160}}>
            <InputLabel id="player-count-label">玩家人數</InputLabel>
            <Select labelId="player-count-label" label="玩家人數" value={count} onChange={e=>setCount(Number(e.target.value))}>
              {Array.from({length:data.config.playerMax-data.config.playerMin+1},(_,i)=>i+data.config.playerMin).map(n=><MenuItem key={n} value={n}>{n} 人</MenuItem>)}
            </Select>
          </FormControl>
          <Button variant="contained" size="large" onClick={()=>setMatch(x=>x+1)}>開始遊戲</Button>
        </Stack>
      </Paper>

      <DocsPanel data={data}/>
    </main>
  </ThemeProvider>;
}
