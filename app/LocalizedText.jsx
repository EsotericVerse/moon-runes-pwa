export default function LocalizedText({value}){
  if(value==null)return null;
  if(typeof value==='string'||typeof value==='number')return <>{value}</>;
  if(typeof value==='object'&&!Array.isArray(value)){
    const zh=value['zh-Hant']??value.zh??value.en??'';
    const en=value.en??value['zh-Hant']??value.zh??'';
    return <>
      <span className="loc-i18n loc-i18n-zh">{zh}</span>
      <span className="loc-i18n loc-i18n-en">{en}</span>
    </>;
  }
  return <>{value}</>;
}
