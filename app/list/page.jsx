import {RuneDirectoryRoot} from '../lrunes/RuneDirectoryPages';
import {lunarunesMetadata} from '../seo/metadata';

export const metadata=lunarunesMetadata({
  title:'符文圖鑑與九組分類｜月之符文',
  description:'瀏覽月之符文的符文圖鑑、九組分類、名稱、方向、月相與基本說明。',
  path:'/list/'
});

export default function Page(){return <RuneDirectoryRoot/>;}
