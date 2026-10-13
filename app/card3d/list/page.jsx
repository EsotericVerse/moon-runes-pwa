import RuneUnifiedView from '../../lrunes/RuneUnifiedView';
import {lunarunesMetadata} from '../../seo/metadata';
export const metadata=lunarunesMetadata({
  title:'66 枚符文 3D 圖鑑｜月之符文',description:'瀏覽九大群組、六十六枚原創符文，以 Effekseer 魔法展示中文字，並預覽正位、半正位、半逆位、逆位四種輪廓。',path:'/card3d/list/'
});
export default function Page(){return <RuneUnifiedView feature="list" defaultView="3d"/>;}
