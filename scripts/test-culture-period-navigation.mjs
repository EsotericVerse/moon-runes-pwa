import test from 'node:test';
import assert from 'node:assert/strict';
import {structurePeriodPreference} from '../app/loc/culture-period-navigation.mjs';

const anchor=(date)=>({entry_type:'anchor',start_date:date});
const period=(id,start,end=null,openEnd=false)=>({
  period:id,start_date:start,end_date:end,open_end:openEnd
});

test('open Period wins over last anchor and does not write an after date',()=>{
  const p=period('P7','2026-06-01',null,true);
  const result=structurePeriodPreference([p],[anchor('2026-09-05')]);
  assert.equal(result.preferredKey,'P7');
  assert.equal(p.end_date,null);
});
test('closed Period uses its real endpoint even when it is not today',()=>{
  assert.equal(structurePeriodPreference(
    [period('P2','2005-01-01','2006-12-31')],
    [anchor('2006-05-13')]).preferredKey,'P2');
});
test('anchor-only timeline defaults to the final anchor-to-after interval',()=>{
  const result=structurePeriodPreference([],[
    anchor('2008-01-01'),anchor('2020-04-12'),anchor('2010-01-01')
  ]);
  assert.equal(result.preferredKey,'after');
  assert.equal(result.lastAnchor.start_date,'2020-04-12');
});
test('an independent anchor after a closed Period does not inherit it',()=>{
  assert.equal(structurePeriodPreference(
    [period('P1','2001-01-01','2005-01-01')],
    [anchor('2005-02-01')]).preferredKey,'after');
});
test('last anchor inside earlier Period selects that Period rather than the newest by order',()=>{
  assert.equal(structurePeriodPreference([
    period('P1','2001-01-01','2005-01-01'),
    period('P2','2006-01-01','2010-01-01')
  ],[anchor('2004-12-01')]).preferredKey,'P1');
});
test('no anchors but a Period prefers the open Period',()=>{
  assert.equal(structurePeriodPreference([
    period('P1','2001-01-01','2005-01-01'),
    period('P2','2026-01-01',null,true)
  ],[]).preferredKey,'P2');
});
test('no Period and no anchor is an honest all/empty state',()=>{
  const result=structurePeriodPreference([],[]);
  assert.equal(result.preferredKey,'all');
  assert.equal(result.lastAnchor,null);
});
test('events and invalid dates do not masquerade as anchors',()=>{
  const result=structurePeriodPreference([],[{
    entry_type:'event',start_date:'2026-10-01'
  },anchor('invalid')]);
  assert.equal(result.preferredKey,'all');
});
