import RuneUnifiedView from '../../lrunes/RuneUnifiedView';
import {lunarunesMetadata} from '../../seo/metadata';

export const metadata=lunarunesMetadata({
  title:'符文月光抽牌 · 原創美術｜月之符文',
  description:'符韻原創美術與動態揭牌，逐次抽取符文並生成原有籤詩。',
  path:'/card/duel/',noIndex:true
});
export default function RuneCardDuel(){return <RuneUnifiedView feature="duel" defaultView="2d"/>;}
