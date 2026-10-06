export const RUNE_DRAW_MODES=Object.freeze([
  {key:'single',count:1,label:'單卡',description:'1 張｜一個問題，一個語意起點。以符文本義、卡牌方向與月相交互看核心提示。',positions:['核心'],path:'duel/one'},
  {key:'daily',count:1,label:'每日抽牌',description:'1 張｜一天一張，以今日為時間範圍，觀看當日狀況、提醒、引導與祝福。',positions:['今日'],path:'duel/daily'},
  {key:'2card',count:2,label:'雙卡',description:'2 張｜以「因 → 果」觀看兩者關係，確認事件最基本的因果方向。',positions:['因','果'],segments:[1,1],path:'duel/two'},
  {key:'3card',count:3,label:'三卡',description:'3 張｜1 / 1 / 1，以「源 → 轉 → 合」形成語意路徑，觀看起點、變化與收束。',positions:['源','轉','合'],segments:[1,1,1],path:'duel/three'},
  {key:'5card',count:5,label:'五卡',description:'5 張｜2 / 1 / 2，以雙因、一個核心變數與雙果觀看兩側條件如何互相影響。',positions:['過去成因 1','過去成因 2','意外變化','現在狀況 1','現在狀況 2'],segments:[2,1,2],path:'duel/five'},
  {key:'ow3gs',count:11,label:'11 卡 OW3gs',description:'11 張｜兩個因果模組綜合判讀；1–6 為因的描述層，7–11 為果的判定層。',positions:['1','2','3','4','5','6','7','8','9','10','11'],path:'duel/ow3gs'}
]);

export const RUNE_CUSTOM_DRAW_MODES=Object.freeze([
  {key:'4card',count:4,label:'4 張',description:'1 / 2 / 1',positions:['前段','變數 1','變數 2','後段'],segments:[1,2,1],displayRows:[1,2,1],path:'duel/four'},
  {key:'6card',count:6,label:'6 張',description:'2 / 2 / 2',positions:['前段 1','前段 2','變數 1','變數 2','後段 1','後段 2'],segments:[2,2,2],displayRows:[2,2,2],path:'duel/six'},
  {key:'7card',count:7,label:'7 張',description:'2 / 3 / 2',positions:['前段 1','前段 2','變數 1','變數 2','變數 3','後段 1','後段 2'],segments:[2,3,2],displayRows:[2,3,2],path:'duel/seven'},
  {key:'8card',count:8,label:'8 張',description:'3 / 2 / 3',positions:['前段 1','前段 2','前段 3','變數 1','變數 2','後段 1','後段 2','後段 3'],segments:[3,2,3],displayRows:[3,2,3],path:'duel/eight'},
  {key:'9card',count:9,label:'9 張',description:'3 / 3 / 3',positions:['前段 1','前段 2','前段 3','變數 1','變數 2','變數 3','後段 1','後段 2','後段 3'],segments:[3,3,3],displayRows:[3,3,3],path:'duel/nine'},
  {key:'10card',count:10,label:'10 張',description:'4 / 2 / 4',positions:['前段 1','前段 2','前段 3','前段 4','變數 1','變數 2','後段 1','後段 2','後段 3','後段 4'],segments:[4,2,4],displayRows:[2,2,2,2,2],path:'duel/ten'}
]);

export const RUNE_ALL_DRAW_MODES=Object.freeze([
  ...RUNE_DRAW_MODES,
  ...RUNE_CUSTOM_DRAW_MODES
]);
