import Rune3DPreview from '../../lrunes/Rune3DPreview';
import {lunarunesMetadata} from '../../seo/metadata';
export const metadata=lunarunesMetadata({
  title:'3D 月光抽牌測試｜月之符文',description:'獨立測試符文即時 3D 表現，不更動現有 2D 版本。',path:'/card3d/duel/',noIndex:true
});
export default function Page(){return <Rune3DPreview mode="duel"/>;}
