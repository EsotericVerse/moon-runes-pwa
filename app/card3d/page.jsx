import {lunarunesMetadata} from '../seo/metadata';
import Rune3DNav from '../lrunes/Rune3DNav';
export const metadata=lunarunesMetadata({
  title:'符文 3D 測試｜月之符文',description:'獨立的 3D 表現測試區，保留 2D 正式展示。',path:'/card3d/',noIndex:true
});
export default function Page(){
  return <main className="loc-next-main"><section className="loc-view">
    <header className="loc-hero loc-hero-feature"><h1>符韻 3D 表現測試</h1><p>測試獨立進行，不改動現有 2D 版本。</p></header>
    <Rune3DNav/>
  </section></main>;
}
