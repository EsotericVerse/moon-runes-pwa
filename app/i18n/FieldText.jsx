'use client';

import {useUiLocale} from './ui-locale';
import {translateUiField} from './ui-functional-copy.mjs';

export default function FieldText({text}){
  const {locale}=useUiLocale();
  return translateUiField(locale,text);
}
