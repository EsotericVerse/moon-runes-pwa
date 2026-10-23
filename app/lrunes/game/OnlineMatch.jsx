'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {produce} from 'immer';
import {Alert,Box,Button,Chip,Paper,Stack,Typography} from '@mui/material';
import {dbRealtimeClient} from '../../loc/db-client.mjs';
import {createLunaRunesGame} from './boardgame-rules.js';

// Public room: no account, referee or extra server. The creating device is
// the one authoritative copy of the existing turn-based game state.
export default function OnlineMatch({data,count,code,isHost,Board,onLeave}){
  const game=useMemo(()=>createLunaRunesGame(data,count),[data,count]);
  const idRef=useRef(null);
  if(!idRef.current)idRef.current=crypto.randomUUID();
  const peerId=idRef.current;
  const channelRef=useRef(null);
  const revision=useRef(isHost?0:-1);
  const stateRef=useRef(null);
  if(isHost&&!stateRef.current)stateRef.current=game.setup();
  const startedRef=useRef(false);
  const [G,setG]=useState(()=>isHost?stateRef.current:null);
  const [started,setStarted]=useState(false);
  const [connection,setConnection]=useState('connecting');
  const [participants,setParticipants]=useState([]);
  const [remoteEffect,setRemoteEffect]=useState(null);
  const [error,setError]=useState('');

  // Supabase Broadcast transports move requests, not a second game engine.
  // Realtime Presence shows connections; snapshots also let late joiners catch up.
  useEffect(()=>{
    let disposed=false;
    const channel=dbRealtimeClient.channel('lrunes:game:'+code,{
      config:{broadcast:{ack:true,self:false},presence:{key:peerId}}
    });
    channelRef.current=channel;
    const send=(event,payload)=>channel.send({type:'broadcast',event,payload})
      .then(result=>{if(result!=='ok'&&!disposed)setError('同步訊息傳送失敗：'+String(result));})
      .catch(e=>{if(!disposed)setError('連線異常：'+String(e?.message||e));});
    const announce=(origin=null,action=null)=>{
      if(!isHost||disposed)return;
      send('snapshot',{
        from:peerId,revision:revision.current,started:startedRef.current,
        state:stateRef.current,action:action?{...action,origin,revision:revision.current}:null
      });
    };
    const applyMove=(move,args,origin)=>{
      if(!isHost||disposed||!startedRef.current||
        !Object.hasOwn(game.moves,move)||!Array.isArray(args)||args.length>3)return;
      const previous=stateRef.current;
      const next=produce(previous,draft=>game.moves[move]({G:draft},...args));
      if(next===previous)return;
      stateRef.current=next;
      revision.current+=1;
      setG(next);
      const action={move,args};
      if(origin&&origin!==peerId)setRemoteEffect({...action,origin,revision:revision.current});
      announce(origin,action);
    };
    channel
      .on('broadcast',{event:'hello'},()=>announce())
      .on('broadcast',{event:'move'},({payload})=>{
        if(payload?.from===peerId||typeof payload?.move!=='string')return;
        applyMove(payload.move,payload.args,payload.from);
      })
      .on('broadcast',{event:'snapshot'},({payload})=>{
        if(isHost||!payload||payload.from===peerId||!payload.state||
          !Array.isArray(payload.state.players)||!Number.isInteger(payload.revision)||
          payload.revision<revision.current)return;
        revision.current=payload.revision;
        stateRef.current=payload.state;
        setG(payload.state);
        startedRef.current=Boolean(payload.started);
        setStarted(Boolean(payload.started));
        if(payload.action&&payload.action.origin!==peerId)
          setRemoteEffect(payload.action);
      })
      .on('presence',{event:'sync'},()=>{
        if(disposed)return;
        const people=Object.values(channel.presenceState()).flat();
        setParticipants(people);
      })
      .subscribe(async(status,reason)=>{
        if(disposed)return;
        if(status==='SUBSCRIBED'){
          setConnection('connected');
          setError('');
          const tracked=await channel.track({id:peerId,host:isHost});
          if(disposed)return;
          if(tracked!=='ok')setError('房間狀態登記失敗：'+String(tracked));
          if(isHost)announce();
          else send('hello',{from:peerId});
        }else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED'){
          setConnection('disconnected');
          if(reason)setError('即時連線中斷：'+String(reason?.message||reason));
        }
      });
    // Keep the active host reducer available to local actions without a
    // parallel renderer or second WebSocket subscription.
    channelRef.current.applyMove=applyMove;
    return()=>{
      disposed=true;
      if(channelRef.current===channel)channelRef.current=null;
      dbRealtimeClient.removeChannel(channel);
    };
  },[code,isHost,peerId,game]);

  const peers=participants.filter(item=>item?.id!==peerId);
  const hostConnected=isHost||participants.some(item=>item?.host===true);
  const connected=connection==='connected';
  const moves=useMemo(()=>Object.fromEntries(
    Object.keys(game.moves).map(move=>[move,(...args)=>{
      if(!startedRef.current||!channelRef.current||connection!=='connected')return;
      if(isHost)channelRef.current.applyMove(move,args,peerId);
      else channelRef.current.send({
        type:'broadcast',event:'move',payload:{from:peerId,move,args}
      }).then(result=>{if(result!=='ok')setError('操作未送達：'+String(result));})
        .catch(e=>setError('操作未送達：'+String(e?.message||e)));
    }])
  ),[game,isHost,peerId,connection]);

  function start(){
    if(!isHost||!connected||startedRef.current)return;
    startedRef.current=true;
    setStarted(true);
    channelRef.current?.send({type:'broadcast',event:'snapshot',payload:{
      from:peerId,revision:revision.current,started:true,state:stateRef.current,action:null
    }}).then(result=>{if(result!=='ok')setError('開局同步失敗：'+String(result));})
      .catch(e=>setError('開局同步失敗：'+String(e?.message||e)));
  }
  return <Box sx={{width:'100%',minWidth:0}}>
    <Paper className="lrg-setup" sx={{m:'12px auto',maxWidth:1480}}>
      <Stack direction={{xs:'column',sm:'row'}} spacing={1.25}
        alignItems={{sm:'center'}} justifyContent="space-between">
        <Box>
          <Typography variant="overline">LUNARUNES · REALTIME</Typography>
          <Typography variant="h6">線上房間 {code}</Typography>
          <Typography variant="body2" color="text.secondary">
            {isHost?'你建立的房間':'已加入房間'} · {G?.players?.length||count} 個遊戲席位
            {' · '}{peers.length+1} 台裝置
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Chip size="small" color={connected?'success':'warning'}
            label={connected?'已連線':'正在重新連線'}/>
          <Button size="small" variant="outlined" onClick={()=>navigator.clipboard?.writeText(code)}>
            複製房號
          </Button>
          <Button size="small" variant="outlined" onClick={onLeave}>離開房間</Button>
        </Stack>
      </Stack>
      {error?<Alert severity="warning" sx={{mt:1.5}} role="alert">{error}</Alert>:null}
      {!isHost&&!hostConnected?<Alert severity="warning" sx={{mt:1.5}}>
        正在等待建立房間的裝置上線；房主離線時無法繼續操作。
      </Alert>:null}
      {!started?<Stack direction={{xs:'column',sm:'row'}} spacing={1.5}
        alignItems={{sm:'center'}} sx={{mt:1.5}}>
        <Typography variant="body2">
          {isHost?'等待其他裝置加入，或直接開局自己操作所有席位。':'等待房主開始遊戲。'}
        </Typography>
        {isHost?<Button variant="contained" disabled={!connected} onClick={start}>
          開始線上對局
        </Button>:null}
      </Stack>:null}
    </Paper>
    {started&&G&&connected&&hostConnected?
      <Board G={G} moves={moves} rules={data} onRestart={onLeave} remoteEffect={remoteEffect}/>:
      started&&!connected?<Alert severity="info" role="status">等待重新連線後恢復牌桌…</Alert>:null}
  </Box>;
}
