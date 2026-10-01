export const RUNE_DRAW_MODES=Object.freeze([
  {key:'single',count:1,label:'單卡',description:'1 張｜符文本義＋卡牌方向＋月相交互。',positions:['核心'],path:'duel/one'},
  {key:'daily',count:1,label:'每日',description:'1 張｜以今日為時間範圍的一張符文。',positions:['今日'],path:'duel/daily'},
  {key:'2card',count:2,label:'雙卡',description:'2 張｜以「因 → 果」觀看兩者關係。',positions:['因','果'],path:'duel/two'},
  {key:'3card',count:3,label:'三卡',description:'3 張｜以「源 → 轉 → 合」形成固定結構。',positions:['源','轉','合'],path:'duel/three'},
  {key:'5card',count:5,label:'五卡',description:'5 張｜兩張過去成因＋一個意外變化＋兩張現在狀況。',positions:['過去成因 1','過去成因 2','意外變化','現在狀況 1','現在狀況 2'],path:'duel/five'},
  {key:'ow3gs',count:11,label:'11卡 OW3gs',description:'11 張｜1–6 因的描述層＋7–11 果的判定層。',positions:['1','2','3','4','5','6','7','8','9','10','11'],path:'duel/ow3gs'}
]);
