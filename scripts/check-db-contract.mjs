import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {parse} from '@babel/parser';

const read=relative=>readFileSync(new URL('../'+relative,import.meta.url),'utf8');
const databaseContract='app/loc/db-contract.mjs';
const databaseClient='app/loc/db-client.mjs';

function functionsIn(source){
  return parse(source,{sourceType:'module'}).program.body
    .map(node=>node.type==='ExportNamedDeclaration'?node.declaration:node)
    .filter(node=>node?.type==='FunctionDeclaration');
}
export function checkDbContract(contractSource,clientSource){
  const creator=functionsIn(contractSource).find(node=>node.id?.name==='createDatabaseClient');
  if(!creator)throw Error('Missing createDatabaseClient declaration');
  const defined=new Set();
  for(const param of creator.params){
    if(param.type==='Identifier')defined.add(param.name);
    else if(param.type==='ObjectPattern')
      for(const prop of param.properties)
        if(prop.type==='ObjectProperty'&&prop.value.type==='Identifier')defined.add(prop.value.name);
  }
  for(const node of creator.body.body){
    if(node.type==='FunctionDeclaration'&&node.id)defined.add(node.id.name);
    if(node.type==='VariableDeclaration')
      for(const declarator of node.declarations)
        if(declarator.id.type==='Identifier')defined.add(declarator.id.name);
  }
  const returned=creator.body.body.findLast(node=>node.type==='ReturnStatement')?.argument;
  if(!returned||returned.type!=='ObjectExpression')
    throw Error('Database contract must return an object');
  const exported=returned.properties.map(prop=>{
    if(prop.type!=='ObjectProperty'||prop.computed||prop.key.type!=='Identifier'||prop.value.type!=='Identifier')
      throw Error('Database contract exports must use static identifier references');
    return {name:prop.key.name,ref:prop.value.name};
  });
  const absent=exported.filter(item=>!defined.has(item.ref)).map(item=>item.name);
  if(absent.length)throw Error('DB contract exports undeclared bindings: '+absent.join(', '));
  const clientAst=parse(clientSource,{sourceType:'module'});
  const destructured=[];
  for(const node of clientAst.program.body){
    const decl=node.type==='ExportNamedDeclaration'?node.declaration:node;
    if(decl?.type!=='VariableDeclaration')continue;
    for(const binding of decl.declarations){
      if(binding.init?.type!=='Identifier'||binding.init.name!=='client'||binding.id.type!=='ObjectPattern')continue;
      for(const prop of binding.id.properties)
        if(prop.type==='ObjectProperty'&&prop.key.type==='Identifier')destructured.push(prop.key.name);
    }
  }
  const names=new Set(exported.map(item=>item.name));
  const missing=destructured.filter(name=>!names.has(name));
  if(missing.length)throw Error('DB client expects missing contract exports: '+missing.join(', '));
  return {exported:exported.length,consumed:destructured.length};
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
  const result=checkDbContract(read(databaseContract),read(databaseClient));
  console.log('DB contract OK: '+result.exported+' exports, '+result.consumed+' consumers.');
}
