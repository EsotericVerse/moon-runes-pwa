'use client';

import {scopeHref} from '../../modular/scope-registry';
import {SITE_IMAGES} from '../../site-images';
import ScopeEditableBlocks from '../ScopeEditableBlocks';

function entity(slot,title){
  return (slot?.entities||[]).find(item=>item.title===title)||null;
}

function unwrapParagraph(value=''){
  const html=String(value||'').trim();
  const match=html.match(/^<p>([\s\S]*)<\/p>$/i);
  return match?match[1]:html;
}

function InlineHtml({html,className=''}) {
  return <span className={className} dangerouslySetInnerHTML={{__html:unwrapParagraph(html)}}/>;
}

function BlockHtml({html,className=''}) {
  if(!html)return null;
  return <div className={className} dangerouslySetInnerHTML={{__html:html}}/>;
}

export default function AboutView(){
  return <section className="loc-view loc-home">
    <header className="loc-hero loc-home-hero">
      <div className="loc-home-hero-copy">
        <ScopeEditableBlocks
          scopeId="loc"
          page="index"
          orders={[1]}
          slotClassName="scope-display-contents"
          renderDisplay={slot=>{
            const english=entity(slot,'English');
            const explanation=entity(slot,'解釋');
            const description=entity(slot,'說明');
            return <>
              {english?.text?<p className="loc-eyebrow"><InlineHtml html={english.text}/></p>:null}
              <div className="home-title-row">
                {slot.title?<h1>{slot.title}</h1>:null}
                {explanation?.text?<p className="loc-subtitle"><InlineHtml html={explanation.text}/></p>:null}
              </div>
              {description?.text?<div className="loc-hero-copy"><BlockHtml html={description.text}/></div>:null}
            </>;
          }}
        />
      </div>
      <figure className="home-hero-visual">
        <picture>
          <source media="(max-width: 900px)" srcSet={SITE_IMAGES.locHeroSmall.src} />
          <img src={SITE_IMAGES.locHero.src} width={SITE_IMAGES.locHero.width} height={SITE_IMAGES.locHero.height} alt="LOC 月典語言架構框架視覺理念圖" loading="lazy" decoding="async" />
        </picture>
      </figure>
    </header>

    <section className="loc-card home-copy-block home-beginner" id="beginner">
      <ScopeEditableBlocks
        scopeId="loc"
        page="index"
        orders={[2]}
        slotClassName="scope-display-contents"
        renderDisplay={slot=>{
          const start=entity(slot,'Start here');
          return <>
            <div className="home-section-heading">
              {start?.title?<p className="loc-eyebrow">{start.title}</p>:null}
              {slot.title?<h2>{slot.title}</h2>:null}
              {start?.text?<p className="loc-subtitle"><InlineHtml html={start.text}/></p>:null}
            </div>
            <div className="home-rune-layout">
              <div className="home-author-copy"><BlockHtml html={slot.text}/></div>
              <figure className="home-framework-figure">
                <img src={SITE_IMAGES.lunarunes.src} width={SITE_IMAGES.lunarunes.width} height={SITE_IMAGES.lunarunes.height} alt="LunaRunes 月之符文" loading="lazy" decoding="async" />
              </figure>
            </div>
          </>;
        }}
      />
    </section>

    <section className="loc-card home-framework home-architecture-presentation" id="framework-map">
      <div className="home-architecture-layout">
        <div className="home-architecture-copy">
          <ScopeEditableBlocks
            scopeId="loc"
            page="index"
            orders={[3]}
            slotClassName="scope-display-contents"
            renderDisplay={slot=>{
              const english=entity(slot,'LOC Architecture');
              return <>
                <div className="home-section-heading">
                  {english?.title?<p className="loc-eyebrow">{english.title}</p>:null}
                  {slot.title?<h2>{slot.title}</h2>:null}
                </div>
                <div className="home-author-copy"><BlockHtml html={slot.text}/></div>
              </>;
            }}
          />
        </div>
        <figure className="home-architecture-figure">
          <img src={SITE_IMAGES.locArchitecture.src} width={SITE_IMAGES.locArchitecture.width} height={SITE_IMAGES.locArchitecture.height} alt="LOC 月典架構：時間長河、玄子、玄裂與玄宇宙" loading="lazy" decoding="async" />
        </figure>
      </div>
    </section>

    <section className="loc-card home-copy-block home-progress" id="progress">
      <ScopeEditableBlocks
        scopeId="loc"
        page="index"
        orders={[4]}
        slotClassName="scope-display-contents"
        renderDisplay={slot=>{
          const textSystem=entity(slot,'文字系統');
          const modules=entity(slot,'系統模組');
          return <>
            <div className="home-section-heading">
              <p className="loc-eyebrow">System Status</p>
              {slot.title?<h2>{slot.title}</h2>:null}
              {slot.text?<p className="loc-subtitle"><InlineHtml html={slot.text}/></p>:null}
            </div>
            <div className="home-draw-bubbles home-status-bubbles" aria-label="LOC 系統狀態">
              {textSystem?<div className="loc-bubble">
                <strong>{textSystem.title}</strong>
                <BlockHtml html={textSystem.text}/>
              </div>:null}
              {modules?<div className="loc-bubble">
                <strong>{modules.title}</strong>
                <BlockHtml html={modules.text}/>
              </div>:null}
            </div>
          </>;
        }}
      />
    </section>

    <section className="loc-card home-copy-block home-skills" id="skills">
      <ScopeEditableBlocks
        scopeId="loc"
        page="index"
        orders={[5]}
        slotClassName="scope-display-contents"
        renderDisplay={slot=>{
          const governance=entity(slot,'loc-km-governance');
          const health=entity(slot,'loc-repo-health-check');
          return <>
            <div className="home-section-heading">
              <p className="loc-eyebrow">LOC GPT Skills</p>
              {slot.title?<h2>{slot.title}</h2>:null}
              {slot.text?<div className="loc-subtitle"><BlockHtml html={slot.text}/></div>:null}
            </div>
            <div className="home-author-copy">
              {governance?<p><strong>{governance.title}</strong>：<InlineHtml html={governance.text}/></p>:null}
              {health?<p><strong>{health.title}</strong>：<InlineHtml html={health.text}/></p>:null}
              <div className="loc-actions"><a className="loc-button primary" href="/LOC-GPT-Skills-v2.0-bundle.zip">下載 LOC GPT Skills v2.0</a></div>
            </div>
          </>;
        }}
      />
    </section>

    <section className="loc-card home-author-words" id="author-words">
      <ScopeEditableBlocks
        scopeId="loc"
        page="index"
        orders={[6]}
        slotClassName="scope-display-contents"
        renderDisplay={slot=><>
          <div className="home-section-heading">
            <p className="loc-eyebrow">About me</p>
            {slot.title?<h2>{slot.title}</h2>:null}
          </div>
          <div className="home-about-layout">
            <div className="home-author-copy"><BlockHtml html={slot.text}/></div>
            <figure className="home-about-figure">
              <img src={SITE_IMAGES.author.src} width={SITE_IMAGES.author.width} height={SITE_IMAGES.author.height} alt="作者 Lucas Oscar Wang 政德" loading="lazy" decoding="async" />
            </figure>
          </div>
        </>}
      />
    </section>
  </section>;
}
