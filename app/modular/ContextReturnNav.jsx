'use client';
import {useUiLocale} from '../i18n/ui-locale';
import {translateUiField} from '../i18n/ui-functional-copy.mjs';

import {navigationHref} from './nav-destinations.mjs';
import useNativeNavigation from './use-native-navigation';

// A page-local parent link; no new fixed or floating navigation bar.
export default function ContextReturnNav({scopeId='lrunes',path='',label='返回功能首頁'}){
  const {locale}=useUiLocale();
  const native=useNativeNavigation();
  return <nav className="scope-context-return scope-preview-links" aria-label={translateUiField(locale,'返回上層')}>
    <a className="loc-button" href={navigationHref(scopeId,path,native)}>← {label}</a>
  </nav>;
}
