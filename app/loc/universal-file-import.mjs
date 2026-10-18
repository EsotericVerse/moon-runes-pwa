// Browser-side document/table adapter. The parser package owns format decoding;
// LOC owns only the existing import row contract and source-preserving field mapping.
import {importRowsFromJson} from './import-batch.mjs';

export const UNIVERSAL_IMPORT_ACCEPT='.zip,.json,.csv,.tsv,.xlsx,.ods,.docx,.pptx,.pdf,.odt,.odp,.odg,.rtf,.md,.html,.htm,.epub,.tex';
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

export async function parseUniversalImportFile(file,{recordPath='',officeParser}={}){
  if(!file||typeof file.name!=='string')throw new Error('請選擇有效的匯入檔案。');
  const type=extensionOf(file.name);
  if(type==='json'){
    const parsed=JSON.parse(await file.text());
    return importRowsFromJson(parsed,recordPath);
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
    title:String(ast?.metadata?.title||file.name.replace(/\.[^.]+$/,'')).trim(),
    content,
    source_native_id:String(file.name),
    createtime:ast?.metadata?.created||null
  }];
}
