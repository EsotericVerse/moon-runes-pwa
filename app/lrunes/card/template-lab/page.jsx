import TemplateLabClient from './TemplateLabClient';
export const metadata={
  title:'LunaRunes · 官方 3D Templates 驗證',
  description:'pmndrs 官方完整 Environment Template 的獨立技術驗證頁面',
  robots:{index:false,follow:false}
};
export default function RuneOfficialTemplateLab(){
  return <TemplateLabClient/>;
}
