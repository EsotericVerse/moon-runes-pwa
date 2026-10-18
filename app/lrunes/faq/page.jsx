import {lunarunesMetadata} from '../../seo/metadata';
import RunesFaqClient from './RunesFaqClient';

export const metadata=lunarunesMetadata({
  title:'常見問題 FAQ｜月之符文',
  description:'月之符文專屬的符文組成、抽牌、方向與月相等常見問題。',
  path:'/faq/'
});

export default function Page(){return <RunesFaqClient/>;}
