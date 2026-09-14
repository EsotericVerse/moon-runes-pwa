import '../rune-atlas-governance.css';
import RuneDrawClient from '../RuneDrawClient';

export const metadata = {
  title: '月之符文抽牌｜LOC',
  description: 'LunaRunes local draw and guidance route.'
};

export default function RuneDrawPage(){
  return <RuneDrawClient/>;
}
