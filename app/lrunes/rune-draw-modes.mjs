export const RUNE_DRAW_MODES=Object.freeze([
  {key:'single',count:1,label:'單卡',description:'1 張｜符文本義＋卡牌方向＋月相交互。',positions:['核心'],path:'duel/one'},
  {key:'daily',count:1,label:'每日',description:'1 張｜以今日為時間範圍的一張符文。',positions:['今日'],path:'duel/daily'},
  {key:'2card',count:2,label:'雙卡',description:'2 張｜以「因 → 果」觀看兩者關係。',positions:['因','果'],segments:[1,1],path:'duel/two'},
  {key:'3card',count:3,label:'三卡',description:'3 張｜1 / 1 / 1，以「源 → 轉 → 合」形成固定結構。',positions:['源','轉','合'],segments:[1,1,1],path:'duel/three'},
  {key:'4card',count:4,label:'四卡',description:'4 張｜1 / 2 / 1，中段以兩張變數展開。',positions:['前段','變數 1','變數 2','後段'],segments:[1,2,1],displayRows:[1,2,1],path:'duel/four'},
  {key:'5card',count:5,label:'五卡',description:'5 張｜2 / 1 / 2，雙因＋一個變數＋雙果。',positions:['過去成因 1','過去成因 2','意外變化','現在狀況 1','現在狀況 2'],segments:[2,1,2],path:'duel/five'},
  {key:'6card',count:6,label:'六卡',description:'6 張｜2 / 2 / 2，前段、變數、後段各兩張。',positions:['前段 1','前段 2','變數 1','變數 2','後段 1','後段 2'],segments:[2,2,2],displayRows:[2,2,2],path:'duel/six'},
  {key:'7card',count:7,label:'七卡',description:'7 張｜2 / 3 / 2，中段以三張變數展開。',positions:['前段 1','前段 2','變數 1','變數 2','變數 3','後段 1','後段 2'],segments:[2,3,2],displayRows:[2,3,2],path:'duel/seven'},
  {key:'8card',count:8,label:'八卡',description:'8 張｜3 / 2 / 3，前後各三張，中段兩張。',positions:['前段 1','前段 2','前段 3','變數 1','變數 2','後段 1','後段 2','後段 3'],segments:[3,2,3],displayRows:[3,2,3],path:'duel/eight'},
  {key:'9card',count:9,label:'九卡',description:'9 張｜3 / 3 / 3，三段各三張。',positions:['前段 1','前段 2','前段 3','變數 1','變數 2','變數 3','後段 1','後段 2','後段 3'],segments:[3,3,3],displayRows:[3,3,3],path:'duel/nine'},
  {key:'10card',count:10,label:'十卡',description:'10 張｜2 / 2 / 2 / 2 / 2 顯示，語義收斂為 4 / 2 / 4。',positions:['前段 1','前段 2','前段 3','前段 4','變數 1','變數 2','後段 1','後段 2','後段 3','後段 4'],segments:[4,2,4],displayRows:[2,2,2,2,2],path:'duel/ten'},
  {key:'ow3gs',count:11,label:'11卡 OW3gs',description:'11 張｜1–6 因的描述層＋7–11 果的判定層。',positions:['1','2','3','4','5','6','7','8','9','10','11'],path:'duel/ow3gs'}
]);
