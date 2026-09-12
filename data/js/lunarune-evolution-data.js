(() => {
  'use strict';
  window.LUNARUNE_EVOLUTION_DATA = {
    history: {
      version:'1.4-rc4',
      title:'LunaRunes Evolution History',
      purpose:'把符文系統自身演化、語意治理演化與可重現實例分開呈現；不把文化時代語義漂移回寫 Base66 Canon。',
      coverage:{system_stage_count:5,governance_evolution_count:8,semantic_history_case_count:22,derived_lexicon_case_count:21,history_only_case_count:1,history_only_cases:['混沌三兄弟']},
      system_stages:[
        {order:1,label:'14',rune_count:14,kind:'system_scale',note:'早期符文集合'},
        {order:2,label:'24',rune_count:24,kind:'system_scale',note:'擴充語意覆蓋'},
        {order:3,label:'32',rune_count:32,kind:'system_scale',note:'持續拆分與補足語意邊界'},
        {order:4,label:'42',rune_count:42,kind:'system_scale',note:'中期結構擴充'},
        {order:5,label:'66',rune_count:66,kind:'system_scale',note:'現行 Base66'}
      ],
      governance_evolution:[
        {order:1,title:'關鍵詞由描述轉為語意錨點',before:'關鍵詞容易因相近語意持續增加。',after:'關鍵詞必須具有獨特性；避免用大量同義詞取代治理。',effect:'降低語意污染，讓 No API 判定有穩定錨點。'},
        {order:2,title:'詞類先於群組主體性',before:'只看字面命中容易把固定名詞或複合詞拆錯。',after:'先判詞類／句內語意角色，再判群組主體性與符文歸屬。',effect:'可處理花枝、地雷等詞彙化轉移。'},
        {order:3,title:'唯一群組與特殊預設',before:'不確定語意容易同時落入多組。',after:'未判定先為特殊；完成判斷後只保留唯一群組。',effect:'避免為了覆蓋率強迫分類。'},
        {order:4,title:'最高級衝突裁決',before:'多符文同時命中時容易靠人工補詞。',after:'只有兩個以上有效候選同時成立時才啟動最高級衝突規則。',effect:'把少數真正衝突留給規則，不讓規則干擾一般單一命中。'},
        {order:5,title:'衍生詞主體性轉移',before:'Graph 主要呈現符文、關鍵詞與群組關係。',after:'另外記錄 surface composition、semantic owner、ambiguous、head ownership 與 lexicalized shift。',effect:'Graph 從對照表升級為可觀察語意依存與主體性轉移的符號式語言模組。'},
        {order:6,title:'二字自然詞驗證',before:'只靠人工列出少數已知轉移案例。',after:'先驗證自然存在的二字詞，再只保留會改變主體性、詞類或唯一歸屬的高價值案例；三字詞建立在此基礎上延伸。',effect:'不做排列組合、不堆同義詞，以少量實例驗證規則能否泛化。'},
        {order:7,title:'完整詞組與最高原則',before:'二字主體性規則若直接套入四字詞，可能被子詞判定綁住。',after:'先判完整詞組；同組多符文不自動歸命，而由整體最高統攝原則決定主體。',effect:'建立 phrase > subphrase 與 highest-principle resolution，避免把所有同組總體誤判為命。'},
        {order:8,title:'最高原則的適用域',before:'只要詞中出現星，容易把星的最高原則過度套用。',after:'先確認星是否仍保有天體／天象語義；固定詞若已詞彙化改義，完整詞義優先。',effect:'保留日月星辰→星，同時正確處理星火→禍與明星非天體義。'}
      ],
      semantic_history_cases:[
        {order:1,title:'混沌三兄弟',kind:'semantic_split',before:'早期相近或重疊的混沌相關語意尚未充分拆分。',after:'經過拆分、正名與語意邊界治理後，現行 Canon 各自維持獨立定義。',note:'歷史狀態保留於演化紀錄；Base66 只顯示現行正式定義。'},
        {order:2,title:'靈魂 → 魂',kind:'ownership_shift',before:'表面同時包含靈與魂。',after:'固定詞整體主體歸魂。',note:'AB → B；直接對齊 Derived Lexicon。'},
        {order:3,title:'界域 → 域',kind:'ownership_shift',before:'表面同時包含界與域。',after:'組合後由域取得整體主體性。',note:'AB → B；直接對齊 Derived Lexicon。'},
        {order:4,title:'暫斷 → 封',kind:'semantic_override',before:'字面容易直接判為斷。',after:'暫時性改變語意主體，歸封而非永久切斷的斷。',note:'A → B；時間／狀態修飾可覆寫字面符文。'},
        {order:5,title:'潛意識 → 夢',kind:'semantic_ownership',before:'詞面沒有直接包含夢。',after:'依現行明確語意規則歸夢。',note:'非字面符文組合，但屬穩定語意歸屬。'},
        {order:6,title:'水土 → 地',kind:'semantic_ownership_shift',before:'字面可拆為水、土兩個符文。',after:'組合後整體主體轉移為地。',note:'AB → C 的主體性轉移實例。'},
        {order:7,title:'花枝 → 語境判定',kind:'lexicalized_shift',before:'可字面拆為花、枝。',after:'固定詞同時可能指植物枝幹或墨魚；沒有語境時不強迫歸花或枝。',note:'詞類／完整詞義先於字面拆解。'},
        {order:8,title:'光暗',kind:'balanced_ambiguity',before:'光與暗兩個候選都直接成立。',after:'保留對等歧義，只有更完整語境出現時才繼續裁決。',note:'不為追求唯一答案而強迫判定。'},
        {order:9,title:'水晶 → 晶',kind:'lexicalized_shift',before:'表面可拆為水、晶。',after:'固定名詞指結晶石英，水的液態語意退出，主體歸晶。',note:'AB → B；字面符文並非永遠同權。'},
        {order:10,title:'星辰 → 星',kind:'lexicalized_shift',before:'表面可拆為星、辰。',after:'固定詞是星的通稱，辰的現行「時期」語意在此不成立。',note:'展示現代固定詞義可以覆寫單字 Canon 語意。'},
        {order:11,title:'空氣 → 氣',kind:'ownership_shift',before:'表面可拆為空、氣。',after:'固定名詞整體主體是氣，不是空間。',note:'AB → B；名詞主體性優先。'},
        {order:12,title:'病因 → 因',kind:'head_ownership',before:'表面可拆為病、因。',after:'病限定範圍，語意主體為因。',note:'驗證組合詞主體性優先於字面同權。'},
        {order:13,title:'緣分 → 緣',kind:'lexicalized_shift',before:'表面可拆為緣、分。',after:'固定詞義中分不再是分離／切分的核心語意，主體歸緣。',note:'AB → A；固定詞義使第二字脫離 Canon 核心。'},
        {order:14,title:'語病 → 誤',kind:'semantic_ownership_shift',before:'表面可拆為語、病。',after:'固定詞指語言表述中的錯誤，整體主體轉移至誤。',note:'AB → C；證明組合詞可產生第三符文語意。'},
        {order:15,title:'地雷 → 特殊',kind:'lexicalized_out_of_domain',before:'表面可拆為地、雷。',after:'固定名詞實際指爆炸武器，沒有足夠理由硬歸地或雷。',note:'不能分類也是有效結果；特殊保留語意邊界。'},
        {order:16,title:'鏡花水月 → 幻',kind:'semantic_ownership_shift',before:'表面直接包含鏡、花、水、月四個符文。',after:'固定詞整體語意主體歸幻。',note:'ABCD → E；surface composition 不等於 semantic owner。'},
        {order:17,title:'花枝招展 → 花',kind:'context_disambiguation',before:'子詞「花枝」本身具有植物與動物名等多義性。',after:'進入完整詞「花枝招展」後，多義被完整語境解除，整體主體歸花。',note:'完整詞組可以反向消除二字詞的歧義。'},
        {order:18,title:'生老病死 → 命',kind:'group_totality_to_fate',before:'生、老、病、死可分別判為四個生命組符文。',after:'四者作為生命整體循環時，主體上升為命。',note:'同組多符文的總體性可產生高一層語意主體。'},
        {order:19,title:'風火雷土 → 玄',kind:'group_totality_resolution',before:'風、火、雷、土分別是元素組中的個別符文。',after:'多種自然力量共同作用時，整體呈現不確定與混沌，主體歸玄。',note:'總體性不是命的充分條件；先判整體最高語意。'},
        {order:20,title:'日月星辰 → 星',kind:'highest_principle_resolution',before:'內部子詞「星辰」可先解析為星。',after:'完整四字皆為天體／天象脈絡，最高統攝原則歸星。',note:'星作為最高原則直接統攝日、月、星、辰。'},
        {order:21,title:'星火 → 禍',kind:'semantic_ownership_shift',before:'表面含星與火，若只看字面可能誤套星或火。',after:'完整固定詞依治理規則主體歸禍。',note:'最高原則有適用域；完整詞義可覆寫單字原則。'},
        {order:22,title:'明星 → 非天體義',kind:'lexicalized_out_of_domain',before:'表面含明與星。',after:'現代常用義指知名人物，不屬天體語義，因此不套用星的最高原則。',note:'詞彙化會限制符文最高原則的適用範圍。'}
      ],
      language_time_policy:{culture_shift_is_observable:true,culture_shift_changes_base66:false,note:'古今詞義與文化轉移可放入時間分析，但不由 LunaRunes Base66 本體直接處理。'}
    },
    analysis: {
      version:'1.0-rc1',status:'complete_for_current_corpus',source_history_version:'1.4-rc4',
      scale_analysis:{start_rune_count:14,current_rune_count:66,absolute_growth:52,growth_multiple:4.7143,growth_percent:371.43,transitions:[{from:14,to:24,delta:10,growth_percent:71.43,share_of_total_growth_percent:19.23},{from:24,to:32,delta:8,growth_percent:33.33,share_of_total_growth_percent:15.38},{from:32,to:42,delta:10,growth_percent:31.25,share_of_total_growth_percent:19.23},{from:42,to:66,delta:24,growth_percent:57.14,share_of_total_growth_percent:46.15}],observation:'系統不是線性等幅增加；42→66 單次新增 24 枚，占現行相對於 Base14 全部增量約 46%，顯示後期曾出現一次大幅語意覆蓋擴張。'},
      semantic_resolution_analysis:{case_count:22,derived_lexicon_case_count:21,history_only_case_count:1,macro_distribution:[{id:'surface_to_semantic_resolution',label:'由字面組成轉向語意主體',count:13,case_orders:[2,3,4,5,6,9,10,11,12,13,14,16,21],signal:'完整詞義、head ownership、lexicalized meaning 或語意覆寫，逐步取代逐字同權解析。'},{id:'ambiguity_or_out_of_domain',label:'保留歧義或拒絕硬分類',count:4,case_orders:[7,8,15,22],signal:'系統允許 ambiguous／特殊／非適用域作為有效結果，而不是為覆蓋率強迫唯一答案。'},{id:'context_or_higher_order_resolution',label:'完整語境與高階統攝',count:4,case_orders:[17,18,19,20],signal:'phrase > subphrase，且同組總體不自動得到同一答案，而由完整語境與最高統攝語意裁決。'},{id:'historical_split',label:'歷史拆分與正名',count:1,case_orders:[1],signal:'演化史保留舊狀態，但現行 Canon 僅顯示正式定義。'}],dominant_signal:'LunaRunes 的主要演化不是單純增加詞彙，而是從表面字形命中轉向語意主體、完整詞義與可拒絕分類的治理。'},
      governance_analysis:{governance_step_count:8,phases:[{label:'語意錨定',orders:[1],direction:'由同義詞堆疊轉為獨特關鍵詞與穩定語意錨點。'},{label:'分類順序與唯一性',orders:[2,3],direction:'詞類／句內角色先於群組主體性，並以唯一群組加特殊預設避免強迫分類。'},{label:'衝突裁決',orders:[4],direction:'只在多個有效候選真正同時成立時才啟動最高級衝突規則。'},{label:'主體性與詞彙化',orders:[5,6],direction:'由符文對照表轉向 surface composition、semantic owner、head ownership 與 lexicalized shift。'},{label:'完整詞組與最高原則',orders:[7,8],direction:'建立 phrase > subphrase、最高統攝原則與適用域限制。'}],trajectory:'治理規則持續由字面比對走向結構化語意解析，同時提高對語境、詞彙化、適用域與不確定性的處理能力。'},
      evolution_signals:[{id:'coverage_expansion',label:'語意覆蓋擴張',evidence:'Base14 → Base66，共增加 52 枚；後期 42→66 的增量最大。'},{id:'governance_deepening',label:'治理深化',evidence:'8 次治理演化逐步從關鍵詞唯一性擴展到詞組、主體性、衝突裁決與適用域。'},{id:'semantic_non_literalization',label:'非字面化解析',evidence:'22 個歷史案例中，13 個主要案例直接呈現字面組成與語意主體不相等。'},{id:'uncertainty_preservation',label:'保留不確定性',evidence:'光暗、花枝、地雷、明星等案例證明歧義、特殊與非適用域是合法結果。'},{id:'higher_order_semantics',label:'高階語意形成',evidence:'生老病死、風火雷土、日月星辰等案例證明多符文組合可形成不同於個別符文的高階主體。'}],
      projection_readiness:{historical_analysis:'ready',rule_based_projection:'ready',time_velocity_projection:'limited',reason:'目前已能從系統尺度、治理規則與語意解析案例推導方向性；但早期 Base 階段缺少完整日期，因此不應虛構每個階段的時間速度。',allowed_projection_dimensions:['語意覆蓋是否持續擴張','治理規則是否持續由字面轉向語境／主體性','歧義保留與特殊預設是否增加','高階語意與詞組解析是否持續增長','衍生詞 ownership 類型是否出現新的穩定模式'],blocked_projection_dimensions:['缺乏日期證據時的精確成長速度','缺乏外部語料證據時的文化語義變動幅度']}
    }
  };
})();
