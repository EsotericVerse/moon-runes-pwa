import {Suspense} from 'react';
import LiteratureWorkClient from './LiteratureWorkClient';

export const metadata={title:'文學作品｜政德｜LOC 月典'};

export default function LiteratureWorkPage(){
  return <Suspense fallback={<p className="scope-v2-status">讀取作品…</p>}>
    <LiteratureWorkClient/>
  </Suspense>;
}
