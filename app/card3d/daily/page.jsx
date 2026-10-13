import RuneUnifiedView from '../../lrunes/RuneUnifiedView';
import {lunarunesMetadata} from '../../seo/metadata';
export const metadata=lunarunesMetadata({
  title:'3D 每日符文測試｜月之符文',description:'獨立測試每日符文 3D 表現，保留 2D 每日指引。',path:'/card3d/daily/',noIndex:true
});
export default function Page(){return <RuneUnifiedView feature="daily" defaultView="3d"/>;}
