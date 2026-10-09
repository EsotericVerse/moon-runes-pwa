begin;

alter table silver.lo3rwang_galaxy_media add column if not exists content_blocks jsonb;
alter table silver.lrunes_galaxy_media add column if not exists content_blocks jsonb;

do $migration$
declare
  v_table text;
  v_rel regclass;
begin
  foreach v_table in array array['loc_blocks','lo3rwang_blocks','lrunes_blocks']
  loop
    v_rel := to_regclass(format('silver.%I',v_table));
    if v_rel is null then
      raise exception 'missing block table: %',v_table;
    end if;

    execute format('alter table silver.%I add column if not exists uid character(8)',v_table);
    execute format(
      'update silver.%I set uid=upper(substr(md5(%L||'':''||block_page||'':''||block_order::text),1,8)) where uid is null',
      v_table,v_table
    );
    execute format(
      'alter table silver.%I alter column uid set default upper(substr(replace(gen_random_uuid()::text,''-'',''''),1,8))',
      v_table
    );
    execute format('alter table silver.%I alter column uid set not null',v_table);

    execute format('alter table silver.%I add column if not exists page_name text',v_table);
    execute format(
      'update silver.%I set page_name=case when block_page=''home'' then ''index'' else block_page end where page_name is null',
      v_table
    );
    execute format('alter table silver.%I alter column page_name set not null',v_table);

    execute format(
      'alter table silver.%I add column if not exists block_entity jsonb not null default ''[]''::jsonb',
      v_table
    );

    execute format('alter table silver.%I drop constraint if exists %I',v_table,v_table||'_pkey');
    execute format('alter table silver.%I drop constraint if exists %I',v_table,v_table||'_page_check');
    execute format('alter table silver.%I drop constraint if exists %I',v_table,v_table||'_order_check');

    execute format('alter table silver.%I add constraint %I primary key(uid)',v_table,v_table||'_pkey');
    execute format(
      'alter table silver.%I add constraint %I check(uid ~ ''^[A-Za-z0-9]{8}$'')',
      v_table,v_table||'_uid_format_check'
    );
    execute format(
      'alter table silver.%I add constraint %I check(block_order >= 1)',
      v_table,v_table||'_order_check'
    );
    execute format(
      'alter table silver.%I add constraint %I check(jsonb_typeof(block_entity)=''array'' and jsonb_array_length(block_entity)<=6)',
      v_table,v_table||'_entity_check'
    );

    execute format('alter table silver.%I drop column block_page',v_table);
    execute format(
      'create index if not exists %I on silver.%I(page_name,block_order)',
      v_table||'_page_order_idx',v_table
    );
  end loop;
end
$migration$;

do $loc_seed$
declare
  v_hero text := '';
  v_beginner text := '';
  v_architecture text := '';
  v_author text := '';
begin
  select
    coalesce(max(block_text) filter(where block_order=1),''),
    coalesce(max(block_text) filter(where block_order=2),''),
    coalesce(max(block_text) filter(where block_order=3),''),
    coalesce(max(block_text) filter(where block_order=4),'')
  into v_hero,v_beginner,v_architecture,v_author
  from silver.loc_blocks
  where page_name='index';

  delete from silver.loc_blocks where page_name='index';

  insert into silver.loc_blocks(page_name,block_title,block_text,block_order,block_entity)
  values
  (
    'index','LOC月典','',1,
    jsonb_build_array(
      jsonb_build_object(
        'uid',upper(substr(md5('loc:index:hero:english'),1,8)),
        'title','English',
        'text','<p>LOC (Language Architecture Framework)</p>'
      ),
      jsonb_build_object(
        'uid',upper(substr(md5('loc:index:hero:explain'),1,8)),
        'title','解釋',
        'text','<p>以多面向語言結構與時間維度，整理、搜尋並呈現語言建築。</p>'
      ),
      jsonb_build_object(
        'uid',upper(substr(md5('loc:index:hero:description'),1,8)),
        'title','說明',
        'text',v_hero
      )
    )
  ),
  (
    'index','新手上路',v_beginner,2,
    jsonb_build_array(
      jsonb_build_object(
        'uid',upper(substr(md5('loc:index:beginner:start'),1,8)),
        'title','Start here',
        'text','<p>不知道怎麼開始沒關係，就抽張牌吧！</p>'
      )
    )
  ),
  (
    'index','LOC架構',v_architecture,3,
    jsonb_build_array(
      jsonb_build_object(
        'uid',upper(substr(md5('loc:index:architecture:english'),1,8)),
        'title','LOC Architecture',
        'text',''
      )
    )
  ),
  (
    'index','系統狀態','<p>目前 LOC 的文字資料、系統架構與主要模組。</p>',4,
    jsonb_build_array(
      jsonb_build_object(
        'uid',upper(substr(md5('loc:index:status:text'),1,8)),
        'title','文字系統',
        'text','<p>Canon 文字欄位：8,150,917 字元（含符文）<br>Galaxy 正文：4,318,463 字元 · Canon 資料列：40,817<br>資料時間：2005 ～ 至今</p><p><a href="https://loc.lo3rwang.cc/statics/">詳細即時總數、來源與分布以統計頁面為準 →</a></p>'
      ),
      jsonb_build_object(
        'uid',upper(substr(md5('loc:index:status:modules'),1,8)),
        'title','系統模組',
        'text','<p>Next.js + React + Supabase</p><p>Next.js 16.3.5 · React 19.3.0 · Supabase PostgreSQL</p><p>文化時間長河：vis-timeline 8.5.4<br>統計：Recharts 3.10.1<br>管理框架：vis-network 10.1.0<br>安全認證：Zod 4.6.0 / Supabase Auth<br>頁面：Motion 13.4.4<br>多媒體搜尋：TanStack Query 5.103.1</p>'
      )
    )
  ),
  (
    'index','Skills','<p>把月典延伸可以重複使用的工作流程。<br>把語言治理與治理資料儲存庫，封裝成可直接調用的 AI Skills。</p><p>Skills 不是另一套理論，而是把 LOC 已形成的治理管理理念跟方法，轉成GPT可以重複執行的工作流程。</p>',5,
    jsonb_build_array(
      jsonb_build_object(
        'uid',upper(substr(md5('loc:index:skills:governance'),1,8)),
        'title','loc-km-governance',
        'text','<p>檢查 Canon、KM、Registry、Base66、術語一致性、資料權威。</p>'
      ),
      jsonb_build_object(
        'uid',upper(substr(md5('loc:index:skills:health'),1,8)),
        'title','loc-repo-health-check',
        'text','<p>檢查儲存庫結構、路徑、API／搜尋、部署與效能風險等。</p>'
      )
    )
  ),
  (
    'index','作者的話',
    '<p>整理治理過去的已知，是為了把時間還給現在，對未知的未來做好準備。</p>'
    ||'<p>文字資料經過基本解析以後，分析出關鍵詞。將關鍵詞整理分類以後，並配合時間線的可能風格變化，進一步解析成為該區間內的風格。</p>'
    ||'<p>人總會因為各種狀況導致文字風格突變，例如當兵，例如車禍意外等等。改變是循序漸進，突變也有其因素影響，從文字可見一斑。</p>'
    ||'<p>其實做整套架構，本來只是用於自己累積數百萬字作品的展示整理，不自覺地整理出了兩項東西，一套是歸納的系統架構論LOC，一套是以符號式語言形成的月之符文。</p>'
    ||'<p>整合出月典，並不是為了把現有人生，固定成某種發展模式，也不是完全為了賺錢，而是把散落、原本只能靠直覺掌握的經驗，整理成可回看、可搜尋、可解析的方式，才能進一步面對未來的各種可能，做到風險管理。</p>'
    ||'<p>我的原則：敬畏未知，尊重異者，專業為先。</p>'
    ||'<p>立於無限減一的謙遜，但要有無限減一的專業。保有探索未知的好奇，尊重無限未知的領域，進而才能學習到更多的知識。</p>'
    ||'<p>Lucas Oscar Wang 政德. 2026.10.01.(ex-admin of StarRiver BBS.)</p>',
    6,'[]'::jsonb
  );
end
$loc_seed$;

do $author_seed$
declare
  v_about1 text := '';
  v_about2 text := '';
  v_about3 text := '';
  v_about4 text := '';
begin
  select
    coalesce(max(block_text) filter(where block_order=1),''),
    coalesce(max(block_text) filter(where block_order=2),''),
    coalesce(max(block_text) filter(where block_order=3),''),
    coalesce(max(block_text) filter(where block_order=4),'')
  into v_about1,v_about2,v_about3,v_about4
  from silver.lo3rwang_blocks
  where page_name='index';

  delete from silver.lo3rwang_blocks where page_name='index';

  insert into silver.lo3rwang_blocks(page_name,block_title,block_text,block_order,block_entity)
  values
  (
    'index','政德','<p>Hello！你好！你可以叫我 Oscar。</p><p>Wordsmith · Chaos Resonator · Language Architect</p><p>Creator of LOC and LunaRunes · <a href="https://suno.com/album/16130013-09f2-4be3-b2f6-05ce171ba7d5">聽《微月光，上場》 →</a></p>',1,
    jsonb_build_array(
      jsonb_build_object(
        'uid',upper(substr(md5('lo3rwang:index:hero:name'),1,8)),
        'title','English',
        'text','<p>Lucas Oscar Wang</p>'
      ),
      jsonb_build_object(
        'uid',upper(substr(md5('lo3rwang:index:hero:role'),1,8)),
        'title','專業定位',
        'text','<p>語言建築師</p>'
      )
    )
  ),
  (
    'index','關於我','',2,
    jsonb_build_array(
      jsonb_build_object('uid',upper(substr(md5('lo3rwang:index:about:intro'),1,8)),'title','自我介紹','text',v_about1),
      jsonb_build_object('uid',upper(substr(md5('lo3rwang:index:about:life'),1,8)),'title','人生觀','text',v_about2),
      jsonb_build_object('uid',upper(substr(md5('lo3rwang:index:about:principle'),1,8)),'title','原則態度','text',v_about3),
      jsonb_build_object('uid',upper(substr(md5('lo3rwang:index:about:ability'),1,8)),'title','擅長能力','text',v_about4),
      jsonb_build_object(
        'uid',upper(substr(md5('lo3rwang:index:about:name'),1,8)),
        'title','名字與識別',
        'text','<p>完整署名是 Lucas Oscar Wang 政德，公開識別為 lo3rwang；日常稱呼仍是 Oscar。</p>'
      ),
      jsonb_build_object(
        'uid',upper(substr(md5('lo3rwang:index:about:philosophy'),1,8)),
        'title','思想底色',
        'text','<p>偏向老子體系的道與德，也重視自然、觀察與不以控制取代理解。</p>'
      )
    )
  ),
  (
    'index','我在做什麼','<p>資訊工程出身。長期程式設計養成的習慣，應用在語言上，就是「物件導向（OOP）」。</p>',3,
    jsonb_build_array(
      jsonb_build_object(
        'uid',upper(substr(md5('lo3rwang:index:professional:wordsmith'),1,8)),
        'title','文字工匠 · Wordsmith',
        'text','<p>針對單一語彙與單詞，會很執著於找出它在句中的本義。因為本義要先確認，才能知道句子的整體解釋。</p>'
      ),
      jsonb_build_object(
        'uid',upper(substr(md5('lo3rwang:index:professional:discerner'),1,8)),
        'title','混沌共振者 · Chaos Resonator',
        'text','<p>針對一團混亂的狀態，會以系統性的方式找尋規則性，進而拆解與破解；也延伸到對未來的風險管理。</p>'
      ),
      jsonb_build_object(
        'uid',upper(substr(md5('lo3rwang:index:professional:architect'),1,8)),
        'title','語言建築師 · Language Architect',
        'text','<p>對語言使用的綜合應用。例：良心，若是涼心又何必量心。不好意思，若不好就意思意思一下就好。這就是文字建築學。</p>'
      ),
      jsonb_build_object(
        'uid',upper(substr(md5('lo3rwang:index:professional:consulting'),1,8)),
        'title','語言顧問與系統設計',
        'text','<p>目前以 <strong>Language Architect</strong> 為主要專業定位；對外合作可依個案採語言顧問、系統設計或專案實作方式進行。</p><p>工作內容包括命名與正名、語意與分類設計、知識與資料架構、規則整理、版本與關係設計，以及既有系統裡的語意衝突與結構問題。</p>'
      ),
      jsonb_build_object(
        'uid',upper(substr(md5('lo3rwang:index:professional:digital'),1,8)),
        'title','數位資產管理',
        'text','<p>另一個長期方向是數位資產管理：整理個人、創作者或組織長期累積的文字、照片、影音、作品、帳號資料、版本與歷史紀錄，讓散落內容重新形成可搜尋、可追溯、可持續管理的資料脈絡。</p>'
      )
    )
  ),
  (
    'index','LOC 與 LunaRunes','',4,
    jsonb_build_array(
      jsonb_build_object(
        'uid',upper(substr(md5('lo3rwang:index:systems:loc'),1,8)),
        'title','LOC／月典',
        'text','<p>LOC／月典本來就是為文化分析而設計，尤其關注尚未被主流充分理解、仍處在社會與法律分類灰區的次文化。它會先把現象、語言、時間與關係整理清楚，讓這些灰色地帶能更快被看見與理解，並為之後更合適的法律定位提供脈絡與材料。</p><p><a href="https://loc.lo3rwang.cc/">查看 LOC／月典 →</a></p>'
      ),
      jsonb_build_object(
        'uid',upper(substr(md5('lo3rwang:index:systems:lrunes'),1,8)),
        'title','LunaRunes／月之符文',
        'text','<p>LunaRunes／月之符文最早從認字學習卡的設計開始，後來逐步發展成一套獨特的符號式語言宇宙，並延伸出「玄宇宙」理論。接下來也準備分別從語言學與工程學整理成論文送審。</p><p><a href="https://lrunes.lo3rwang.cc/">查看 LunaRunes／月之符文 →</a></p>'
      )
    )
  ),
  (
    'index','三魂','<p><strong>柏隆／Bruno、睿汶／Raven</strong> 是未來真實兒女的預留命名，不屬於三魂。</p>',5,
    jsonb_build_array(
      jsonb_build_object(
        'uid',upper(substr(md5('lo3rwang:index:souls:oscar'),1,8)),
        'title','Oscar／政德 · 人魂／本體',
        'text','<p>日常稱呼仍是 Oscar。完整署名為 Lucas Oscar Wang 政德，是創作、工作與現實選擇的中心。</p>'
      ),
      jsonb_build_object(
        'uid',upper(substr(md5('lo3rwang:index:souls:lucas'),1,8)),
        'title','玄鑒／Lucas · 天魂',
        'text','<p>對應 LOC／月典，字月典。尋找規律與秩序，是為了取得自己的平衡。</p>'
      ),
      jsonb_build_object(
        'uid',upper(substr(md5('lo3rwang:index:souls:rune'),1,8)),
        'title','符韻／Rune · 地魂',
        'text','<p>對應 LunaRunes／月語，字月語。以符文、文字與韻律和未知溝通。</p>'
      )
    )
  ),
  (
    'index','聯絡與官方連結','<p>合作、顧問、系統設計、數位資產管理或其他公開內容相關事項，可透過電子郵件聯絡。</p><p><a href="mailto:sopa2306@gmail.com">sopa2306@gmail.com</a></p><p><a href="https://www.linkedin.com/in/lo3rwang/">LinkedIn</a> · <a href="https://www.instagram.com/lo3rwang/">Instagram</a> · <a href="https://www.threads.com/@lo3rwang">Threads</a></p>',6,'[]'::jsonb
  );
end
$author_seed$;

commit;
