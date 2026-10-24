// Browser-side document/table adapter. The parser package owns format decoding;
// LOC owns only the existing import row contract and source-preserving field mapping.
import {importRowsFromJson} from './import-batch.mjs';

export {UNIVERSAL_IMPORT_ACCEPT} from './import-batch.mjs';
const TABLE_FORMATS=new Set(['csv','tsv','xlsx','ods']);
const DOCUMENT_FORMATS=new Set(['docx','pptx','pdf','odt','odp','odg','rtf','md','html','htm','epub','tex']);
const MAX_DOCUMENT_BYTES=128*1024*1024;
const forbiddenHeaders=new Set(['__proto__','prototype','constructor']);

function extensionOf(name){
  return String(name||'').match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase()||'';
}
function cellColumn(node,fallback){
  const column=Number(node?.metadata?.col);
  return Number.isSafeInteger(column)&&column>=0?column:fallback;
}
function rowCells(node){
  const cells=new Map();
  let column=0;
  for(const child of node?.children||[]){
    if(child?.type!=='cell')continue;
    const current=cellColumn(child,column);
    if(cells.has(current))throw new Error('同一列出現重複欄位位置，已停止匯入。');
    cells.set(current,String(child.text??''));
    column=current+1;
  }
  return cells;
}
export function officeTableRows(ast){
  const output=[];
  for(const sheet of ast?.content||[]){
    if(sheet?.type!=='sheet')continue;
    const rows=(sheet.children||[]).filter(node=>node?.type==='row');
    if(!rows.length)continue;
    const headers=rowCells(rows[0]);
    if(!headers.size)throw new Error('表格缺少標題列，無法安全映射欄位。');
    const used=new Set();
    for(const [index,value] of headers){
      const name=value.replace(/^\uFEFF/,'').trim();
      if(!name)throw new Error('表格標題列有空白欄位，請先修正來源檔案。');
      if(forbiddenHeaders.has(name)||used.has(name))throw new Error('表格標題列含重複或不安全欄名：'+name);
      used.add(name);
      headers.set(index,name);
    }
    for(const node of rows.slice(1)){
      const cells=rowCells(node);
      if(!cells.size||![...cells.values()].some(v=>v.trim()))continue;
      const row=Object.create(null);
      for(const [index,name] of headers)row[name]=cells.get(index)||'';
      // Keep source worksheet provenance without treating it as an import field.
      row.__source_sheet=String(sheet.metadata?.sheetName||'');
      output.push(row);
    }
  }
  if(!output.length)throw new Error('沒有可匯入的表格資料列。');
  return output;
}

// Galaxy Markdown v1 is a UTF-8 Markdown document with optional, scalar YAML
// frontmatter. Retain Markdown as the article body instead of flattening it
// through the generic document extractor (which discards formatting).
const GALAXY_MARKDOWN_FORMAT='galaxy-md/v1';
const MARKDOWN_HEADER_KEYS=new Set([
  'loc_format','uid','title','created_at','createtime','source_name',
  'source_place','searchable','statistics_able'
]);
function scalarFrontmatter(value){
  const raw=String(value||'').trim();
  if((raw.startsWith('"')&&raw.endsWith('"'))||
     (raw.startsWith("'")&&raw.endsWith("'"))){
    if(raw.startsWith('"')){
      try{return JSON.parse(raw);}catch{throw new Error('Markdown 檔頭的引號字串格式有誤。');}
    }
    return raw.slice(1,-1).replace(/''/g,"'");
  }
  return raw;
}
function markdownFrontmatter(input){
  const text=String(input||'').replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n');
  const match=/^---[ \t]*\n([\s\S]*?)\n(?:---|\.\.\.)[ \t]*(?:\n|$)/.exec(text);
  if(!match){
    if(text.startsWith('---\n')&&/^loc_format\s*:/m.test(text.slice(0,4096)))
      throw new Error('Galaxy Markdown 檔頭缺少結束分隔線 ---。');
    return {fields:Object.create(null),body:text};
  }
  if(match[0].length>65536)throw new Error('Markdown 檔頭超過 64 KiB。');
  const fields=Object.create(null);
  let hasMetadata=false;
  for(const line of match[1].split('\n')){
    if(!line.trim()||/^\s*#/.test(line))continue;
    const pair=/^([a-z][a-z0-9_-]*)\s*:\s*(.*)$/i.exec(line);
    // Non-scalar YAML is not a Galaxy metadata contract. Preserve the
    // original document unless it explicitly claims to be Galaxy Markdown.
    if(!pair){
      if(/^loc_format\s*:/m.test(match[1]))
        throw new Error('Galaxy Markdown v1 檔頭僅支援單行 key: value 欄位。');
      return {fields:Object.create(null),body:text};
    }
    const key=pair[1].toLowerCase();
    if(MARKDOWN_HEADER_KEYS.has(key)){
      if(Object.prototype.hasOwnProperty.call(fields,key))
        throw new Error('Markdown 檔頭有重複欄位：'+key);
      fields[key]=scalarFrontmatter(pair[2]);
      hasMetadata=true;
    }
  }
  return hasMetadata?{fields,body:text.slice(match[0].length)}:
    {fields:Object.create(null),body:text};
}
function optionalMarkdownBoolean(value,key){
  if(value===undefined)return undefined;
  if(value===true||value===false)return value;
  if(/^(true|1)$/i.test(String(value)))return true;
  if(/^(false|0)$/i.test(String(value)))return false;
  throw new Error('Markdown 檔頭 '+key+' 必須為 true 或 false。');
}
async function stableMarkdownUid(source){
  if(!globalThis.crypto?.subtle?.digest)
    throw new Error('此裝置無法安全計算 Markdown 文件識別碼。');
  const bytes=new TextEncoder().encode(GALAXY_MARKDOWN_FORMAT+'\n'+source);
  const hash=new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',bytes));
  // 8 uppercase base-32 characters (40 bits), matching Galaxy's 8-char UID.
  let value=0n;
  for(const part of hash.slice(0,5))value=(value<<8n)|BigInt(part);
  return value.toString(32).toUpperCase().padStart(8,'0');
}
export async function parseGalaxyMarkdownFile(file){
  const original=await file.text();
  const {fields,body}=markdownFrontmatter(original);
  const content=body.trim();
  if(!content)throw new Error('Markdown 文件沒有正文內容。');
  if(fields.loc_format&&fields.loc_format!==GALAXY_MARKDOWN_FORMAT)
    throw new Error('不支援的 Galaxy Markdown 版本：'+fields.loc_format);
  const date=fields.created_at||fields.createtime||null;
  if(date&&!Number.isFinite(Date.parse(String(date))))
    throw new Error('Markdown 檔頭的 created_at 日期無效。');
  const explicitUid=String(fields.uid||'').trim();
  if(explicitUid&&!/^[a-z0-9]{8}$/i.test(explicitUid))
    throw new Error('Markdown 檔頭的 uid 必須是 8 位英數字。');
  const heading=/^#\s+(.+)\s*$/m.exec(content)?.[1]?.trim();
  const title=String(fields.title||heading||file.name.replace(/\.md$/i,'')).trim();
  const uid=explicitUid.toUpperCase()||await stableMarkdownUid(
    String(original).replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n'));
  return [{
    uid,title,content,createtime:date,
    ...(fields.source_name?{source_name:String(fields.source_name)}:{}),
    ...(fields.source_place?{source_place:String(fields.source_place)}:{}),
    ...(fields.searchable!==undefined?{searchable:optionalMarkdownBoolean(fields.searchable,'searchable')}:{}),
    ...(fields.statistics_able!==undefined?{statistics_able:optionalMarkdownBoolean(fields.statistics_able,'statistics_able')}:{}),
  }];
}

export async function parseUniversalImportFile(file,{recordPath='',officeParser}={}){
  if(!file||typeof file.name!=='string')throw new Error('請選擇有效的匯入檔案。');
  const type=extensionOf(file.name);
  if(type==='json'){
    const parsed=JSON.parse(await file.text());
    return importRowsFromJson(parsed,recordPath);
  }
  if(type==='md'){
    if(!Number.isFinite(file.size)||file.size<=0||file.size>MAX_DOCUMENT_BYTES)
      throw new Error('Markdown 文件為空或超過 128 MiB 單檔上限。');
    return parseGalaxyMarkdownFile(file);
  }
  if(!TABLE_FORMATS.has(type)&&!DOCUMENT_FORMATS.has(type))
    throw new Error('不支援的文件格式：'+(type||'未知'));
  if(!Number.isFinite(file.size)||file.size<=0||file.size>MAX_DOCUMENT_BYTES)
    throw new Error('文件為空或超過 128 MiB 單檔解析上限。');
  // Lazy import: large document parser does not enter the initial LOC interface bundle.
  const parser=officeParser||(await import('officeparser/slim')).OfficeParser;
  if(typeof parser?.parseOffice!=='function')throw new Error('通用文件解析模組不可用。');
  const options=type==='tsv'?{fileType:'csv',csvDelimiter:'\t'}:
    type==='htm'?{fileType:'html'}:
    type==='csv'||type==='md'||type==='html'||type==='tex'?{fileType:type}:{};
  const ast=await parser.parseOffice(file,options);
  if(TABLE_FORMATS.has(type))return officeTableRows(ast);
  const result=await ast.to('text');
  const content=String(result?.value||'').trim();
  if(!content)throw new Error('文件沒有可擷取的文字內容。');
  return [{
    title:String(ast?.metadata?.title||'').trim(),
    content,
    createtime:ast?.metadata?.created||null
  }];
}
