import {lunarunesMetadata} from '../seo/metadata';
import Rune3DNav from '../lrunes/Rune3DNav';

export const metadata=lunarunesMetadata({
  title:'符文 3D 場域｜月之符文',
  description:'同一座 3D 星域的兩種操作：指定符文圖鑑、隨機抽牌召喚。',
  path:'/card/',noIndex:true
});

export default function RuneCardHub(){
  return <main className="loc-next-main"><section className="loc-view">
    <header className="loc-hero loc-hero-feature">
      <p className="loc-eyebrow">LunaRunes · Living 3D</p>
      <h1>符文 3D 場域</h1>
      <p>同一座恆動的 3D 月光世界，選擇隨機抽牌或指定符文。</p>
    </header>
    <Rune3DNav/>
  </section></main>;
}
