'use client';
import dynamic from 'next/dynamic';
import {useState} from 'react';

// Renderer is isolated from SSR. No changes to the production rune draw/data path.
const OfficialEnvironmentExample=dynamic(()=>import('./OfficialEnvironmentExample'),{ssr:false,
  loading:()=> <p role="status">載入官方完整 3D Template…</p>});
const OfficialPortalExample=dynamic(()=>import('./OfficialPortalExample'),{ssr:false,
  loading:()=> <p role="status">載入官方 Portals 3D Template…</p>});
const PRESETS=['sunset','dawn','night','warehouse','forest','apartment','studio','city','park','lobby'];
export default function TemplateLabClient(){
  const [template,setTemplate]=useState('environment');
  const [preset,setPreset]=useState('night');
  const [portal1,setPortal1]=useState(.25);
  const [portal2,setPortal2]=useState(.25);
  const [blur,setBlur]=useState(.65);
  const [roughness,setRoughness]=useState(1);
  return <main className="loc-next-main" style={{maxWidth:1260,margin:'0 auto',padding:16}}>
    <header style={{marginBottom:14}}>
      <p className="loc-eyebrow">LunaRunes · Official Templates First</p>
      <h1>3D 官方模板驗證場</h1>
      <p>第一階段：直接導入 pmndrs 官方完整 Environment Blur &amp; Transitions 與 Portals Examples。
        只切換官方完整模板、原廠 HDRI Preset 與已提供的參數；正式符文展示尚未切換。</p>
    </header>
    <section aria-label="官方場景預設選擇" style={{display:'flex',flexWrap:'wrap',gap:16,alignItems:'center',marginBottom:12}}>
      <label>完整場景模板　<select value={template} onChange={e=>setTemplate(e.target.value)}
        style={{padding:10,borderRadius:8}}>
        <option value="environment">官方 Environment &amp; Shadows</option>
        <option value="portals">官方 Portals · 三層 3D 世界</option>
      </select></label>
      {template==='environment'?<><label>完整環境預設　<select value={preset} onChange={e=>setPreset(e.target.value)}
        style={{padding:10,borderRadius:8}}>
        {PRESETS.map(value=><option key={value} value={value}>{value}</option>)}
      </select></label>
      <label>原廠 Environment Blur　<input type="range" min="0" max="1" step=".05"
        value={blur} onChange={e=>setBlur(Number(e.target.value))}/>{blur.toFixed(2)}</label>
      <label>原廠材質 Roughness　<input type="range" min="0" max="1" step=".05"
        value={roughness} onChange={e=>setRoughness(Number(e.target.value))}/>{roughness.toFixed(2)}</label></>:
      <><label>原廠 Portal Blur　<input type="range" min="0" max="1" step=".05"
        value={portal1} onChange={e=>setPortal1(Number(e.target.value))}/>{portal1.toFixed(2)}</label>
      <label>第二層 Portal Blur　<input type="range" min="0" max="1" step=".05"
        value={portal2} onChange={e=>setPortal2(Number(e.target.value))}/>{portal2.toFixed(2)}</label></>}
    </section>
    <section aria-label="官方完整範例 3D 場景" style={{height:'min(70vh,740px)',minHeight:400,
      borderRadius:18,overflow:'hidden',background:'#101021',position:'relative'}}>
      {template==='portals'?<OfficialPortalExample portal1={portal1} portal2={portal2}/>:
        <OfficialEnvironmentExample preset={preset} blur={blur} roughness={roughness}/>}
    </section>
    <p style={{marginTop:12}}>原始官方範例：
      {' '}<a href="https://github.com/pmndrs/examples/tree/main/examples/environment-blur-and-transitions"
        target="_blank" rel="noopener noreferrer">pmndrs/examples · environment-blur-and-transitions</a>。
      另含{' '}<a href="https://github.com/pmndrs/examples/tree/main/examples/portals"
      target="_blank" rel="noopener noreferrer">pmndrs/examples · portals</a>。
      此頁只驗證完整場景模板的載入與原生參數，不替代既有抽牌頁。</p>
    <p><a href="/lrunes/card/">← 返回符文 3D 首頁</a></p>
  </main>;
}
