'use client';

import {useScopeRuntime} from '../modular/use-scope-runtime';
import {heroExtraFor} from './hero-extra.mjs';

// Sign eligibility is assigned once by the database when a Scope is registered.
// All visitors see the same personal-IP sign; the page never inspects an email.
export default function HeroCornerIdentity({scopeId}){
  const {scopeId:runtimeId,registryRow}=useScopeRuntime();
  const sign=heroExtraFor({
    scopeId,
    scopeKind:runtimeId===scopeId?registryRow?.scope_kind:'',
    extraSign:runtimeId===scopeId?registryRow?.extra_sign:''
  });
  if(!sign)return null;
  return <span className={'home-hero-identity home-hero-identity--'+sign.key}
    role="img" aria-label={sign.label}>{sign.text}</span>;
}
