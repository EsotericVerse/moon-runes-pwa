import {SITE_IMAGES} from '../../site-images';
import LocHomeEditableBlock from '../LocHomeEditableBlock';

export default function AboutView(){
  return <section className="loc-view loc-home">
    <header className="loc-hero loc-home-hero">
      <LocHomeEditableBlock order={1} variant="hero"/>
      <figure className="home-hero-visual">
        <picture>
          <source media="(max-width: 900px)" srcSet={SITE_IMAGES.locHeroSmall.src} />
          <img src={SITE_IMAGES.locHero.src} width={SITE_IMAGES.locHero.width} height={SITE_IMAGES.locHero.height} alt="LOC 月典語言架構框架視覺理念圖" loading="lazy" decoding="async" />
        </picture>
      </figure>
    </header>

    <section className="loc-card home-copy-block home-beginner" id="beginner">
      <LocHomeEditableBlock order={2} variant="beginnerHeading"/>
      <div className="home-rune-layout">
        <LocHomeEditableBlock order={2} variant="body"/>
        <figure className="home-framework-figure">
          <img src={SITE_IMAGES.lunarunes.src} width={SITE_IMAGES.lunarunes.width} height={SITE_IMAGES.lunarunes.height} alt="LunaRunes 月之符文" loading="lazy" decoding="async" />
        </figure>
      </div>
    </section>

    <section className="loc-card home-framework home-architecture-presentation" id="framework-map">
      <div className="home-architecture-layout">
        <div className="home-architecture-copy">
          <LocHomeEditableBlock order={3} variant="architectureHeading"/>
          <LocHomeEditableBlock order={3} variant="body"/>
        </div>
        <figure className="home-architecture-figure">
          <img src={SITE_IMAGES.locArchitecture.src} width={SITE_IMAGES.locArchitecture.width} height={SITE_IMAGES.locArchitecture.height} alt="LOC 月典架構：時間長河、玄子、玄裂與玄宇宙" loading="lazy" decoding="async" />
        </figure>
      </div>
    </section>

    <section className="loc-card home-copy-block home-progress" id="progress">
      <LocHomeEditableBlock order={4} variant="statusHeading"/>
      <LocHomeEditableBlock order={4} variant="statusBubbles"/>
    </section>

    <section className="loc-card home-copy-block home-skills" id="skills">
      <LocHomeEditableBlock order={5} variant="skillsHeading"/>
      <LocHomeEditableBlock order={5} variant="skillsBody"/>
      <div className="loc-actions">
        <a className="loc-button primary" href="/LOC-GPT-Skills-v2.0-bundle.zip">下載 LOC GPT Skills v2.0</a>
      </div>
    </section>

    <section className="loc-card home-author-words" id="author-words">
      <LocHomeEditableBlock order={6} variant="authorHeading"/>
      <div className="home-about-layout">
        <LocHomeEditableBlock order={6} variant="authorBody"/>
        <figure className="home-about-figure">
          <img src={SITE_IMAGES.author.src} width={SITE_IMAGES.author.width} height={SITE_IMAGES.author.height} alt="作者 Lucas Oscar Wang 政德" loading="lazy" decoding="async" />
        </figure>
      </div>
    </section>
  </section>;
}
