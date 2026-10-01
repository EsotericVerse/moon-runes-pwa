export const RUNE_DRAW_MODES=Object.freeze([
  {key:'single',count:1,label:'單卡',description:'1 張｜一個問題，一個語意起點。',positions:['核心'],path:'duel/one'},
  {key:'daily',count:1,label:'每日',description:'1 張｜一天一張，觀看當日提示。',positions:['今日'],path:'duel/daily'},
  {key:'2card',count:2,label:'雙卡',description:'2 張｜以「因 → 果」觀看兩者關係。',positions:['因','果'],path:'duel/two'},
  {key:'3card',count:3,label:'三卡',description:'3 張｜以「源 → 轉 → 合」形成語意路徑。',positions:['源','轉','合'],path:'duel/three'},
  {key:'5card',count:5,label:'五卡',description:'5 張｜以兩個因果為基礎，加上一個變數。',positions:['過去成因 1','過去成因 2','意外變化','現在狀況 1','現在狀況 2'],path:'duel/five'},
  {key:'ow3gs',count:11,label:'11卡 OW3gs',description:'11 張｜OW3gs：兩個因果模組綜合的演算法。',positions:['1','2','3','4','5','6','7','8','9','10','11'],path:'duel/ow3gs'}
]);
