import {lunarunesMetadata} from '../seo/metadata';
import RuneArtNav from '../lrunes/Rune3DNav';

export const metadata=lunarunesMetadata({
  title:'符文美術場域｜月之符文',
  description:'原創畫作構成的月光儀式：隨機抽牌、指定符文與每日指示。',
  path:'/card/',noIndex:true
});

export default function RuneCardHub(){
  return <main className="loc-next-main"><section className="loc-view">
    <header className="loc-hero loc-hero-feature">
      <p className="loc-eyebrow">LunaRunes · Living Artwork</p>
      <h1>符文美術場域</h1>
      <p>以符韻原創美術為主角，選擇月光抽牌、群組畫廊或每日符文。</p>
    </header>
    <RuneArtNav/>
  </section></main>;
}
