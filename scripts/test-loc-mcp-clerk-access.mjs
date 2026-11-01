import test from 'node:test';
import assert from 'node:assert/strict';
import {mcpClerkSession} from '../app/loc/mcp/clerk-access.mjs';
test('Clerk session works for an authorized Scope even without legacy email management',async()=>{
  const result=await mcpClerkSession({load:async()=>({user:{id:'user_123'},session:{
    getToken:async()=> 'signed.jwt.token'}})});
  assert.deepEqual(result,{subject:'user_123',token:'signed.jwt.token'});
});
test('signed out or invalid Clerk identity cannot access the Authority',async()=>{
  await assert.rejects(mcpClerkSession({load:async()=>({user:{id:'user_123'}})}),/login/);
  await assert.rejects(mcpClerkSession({load:async()=>({user:{id:'invalid'},session:{
    getToken:async()=> 'jwt'}})}),/login/);
});
