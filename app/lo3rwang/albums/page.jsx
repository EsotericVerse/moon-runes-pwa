import AuthorAlbums from './AuthorAlbums';
import {authorMetadata} from '../../seo/metadata';
import './albums.css';

export const metadata=authorMetadata({
  title:'政德的音樂專輯｜創作歌曲與風格導引',
  description:'從時間長河的創作風格出發，瀏覽政德已公開的 Suno 專輯、專輯介紹、正式曲序與每首歌曲。',
  path:'/lo3rwang/albums/'
});

export default function Page(){
  return <div className="loc-next-main" data-loc-scope="lo3rwang" data-loc-view="albums">
    <AuthorAlbums/>
  </div>;
}
