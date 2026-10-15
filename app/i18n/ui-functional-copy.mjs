// Functional UI strings live in one JSON file per locale. This helper never
// translates Galaxy records, Suno Style, Meta Tags or authored content.
import zhTw from './zh_tw.json' with {type:'json'};
import zhCn from './zh_cn.json' with {type:'json'};
import enJson from './en.json' with {type:'json'};
import jaJson from './ja.json' with {type:'json'};

const dictionaries=Object.freeze({
  'zh-Hant':zhTw,'zh-Hans':zhCn,en:enJson,ja:jaJson
});

export function translateUiField(locale,text){
  const value=String(text??'');
  const translated=dictionaries[locale]?.fields?.[value];
  return translated||(locale==='ja'?enJson.fields[value]:null)||value;
}
