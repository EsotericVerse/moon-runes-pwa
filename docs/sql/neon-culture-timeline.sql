-- Neon Current migration: restore the eight-stage Zhengde culture timeline.
-- The source document remains in bronze for provenance; the runtime reads the view api.runtime_json_documents.
update bronze.json_documents
set payload=coalesce(payload,'{}'::jsonb) || jsonb_build_object(
  'timeline',jsonb_build_array(
    jsonb_build_object('id','zhengde-feeling-reflection','order',1,'name','感受與自省','summary','從個人經驗、記憶與身體感受出發，以提問理解自己與世界。'),
    jsonb_build_object('id','zhengde-micro-moonlight','order',2,'name','微月光','summary','黑暗可以被完整描述，但最後保留一點光；希望之尾開始形成。'),
    jsonb_build_object('id','zhengde-wave-progression','order',3,'name','浪潮推進','summary','從承受轉向移動：借力前行，不逆浪而行。'),
    jsonb_build_object('id','zhengde-daylight-moon','order',4,'name','白晝之月','summary','看清現實，仍願相信微光；浪漫開始受到現實校正。'),
    jsonb_build_object('id','zhengde-life-platform','order',5,'name','人生月台','summary','事件不再等於命運；該做的做好，等待或選擇下一班車。'),
    jsonb_build_object('id','zhengde-let-nature','order',6,'name','順其自然','summary','不預設結果，不預支期待；允許可能性存在，但不把願望當成事實。'),
    jsonb_build_object('id','zhengde-free-wind','order',7,'name','自由的風','summary','從離開限制走向取得行動權，開始主動選擇自己的方向。'),
    jsonb_build_object('id','zhengde-free-moon','order',8,'name','自由的月','summary','自由之後進入自我治理：整理、邊界、取捨、責任、收尾與航向。')
  )
)
where source_repo='EsotericVerse/moon-runes-pwa'
  and source_path='data/json/registries/ZHENGDE_CULTURE_KEYWORDS.json'
  and superseded_at is null;

select source_path,jsonb_array_length(payload->'timeline') as timeline_count
from api.runtime_json_documents
where source_path='data/json/registries/ZHENGDE_CULTURE_KEYWORDS.json';
