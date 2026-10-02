'use client';

import {useNeonAccount} from '../../loc/use-neon-account';
import GameView from './GameView';

export default function PrivateGameView(){
  const account=useNeonAccount();

  if(account.loading||account.permissionLoading){
    return <section className="loc-view"><div className="loc-card">檢查 Game 權限…</div></section>;
  }
  if(!account.user){
    return <section className="loc-view">
      <header className="loc-hero"><p className="loc-eyebrow">LunaRunes Game</p><h1>符文遊戲</h1><p>此 project 不公開。</p></header>
      <section className="loc-card"><button className="loc-button primary" type="button" onClick={account.signIn}>登入</button></section>
    </section>;
  }
  if(!account.canManageScopeSync('lrunes')){
    return <section className="loc-view"><section className="loc-card"><p>目前帳號沒有 Game 存取權限。</p><button type="button" onClick={account.signOut}>登出</button></section></section>;
  }
  return <GameView/>;
}
