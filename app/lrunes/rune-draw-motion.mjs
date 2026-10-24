/** Nine semantic card-flight rhythms. The rune manifestation VFX remains Effekseer-owned. */
const PATHS=Object.freeze({
  // x/y are ratios of the stage measured once when a draw starts.
  '靈魂':{name:'浮現',duration:1.3,x:[-.26,-.2,-.05,0],y:[.18,-.09,-.12,0],scale:[.78,.9,1.13,1.46],flip:[0,24,88,180],tilt:[-14,-12,-4,0]},
  '連結':{name:'牽引',duration:1.06,x:[-.26,-.12,.06,0],y:[.18,.02,-.02,0],scale:[.8,1,1.54,1.46],flip:[0,70,152,180],tilt:[-14,2,7,0]},
  '生命':{name:'脈動',duration:1.24,x:[-.26,-.19,-.09,0],y:[.18,.08,-.03,0],scale:[.74,1.11,.97,1.46],flip:[0,62,120,180],tilt:[-14,-4,4,0]},
  '自然':{name:'生長',duration:1.4,x:[-.26,-.24,-.11,0],y:[.18,.14,-.08,0],scale:[.74,.86,1.16,1.46],flip:[0,20,85,180],tilt:[-14,-12,-7,0]},
  '礦物':{name:'承重',duration:1.19,x:[-.26,-.21,-.04,0],y:[.18,.04,.10,0],scale:[.85,1.11,1.3,1.46],flip:[0,50,155,180],tilt:[-14,-2,-1,0]},
  '元素':{name:'激發',duration:.88,x:[-.26,-.07,.05,0],y:[.18,-.14,-.05,0],scale:[.8,1.27,1.66,1.46],flip:[0,105,160,180],tilt:[-14,13,-9,0]},
  '秩序':{name:'校準',duration:1.1,x:[-.26,-.16,-.06,0],y:[.18,.1,.04,0],scale:[.82,1,1.27,1.46],flip:[0,60,120,180],tilt:[-14,-8,0,0]},
  '無序':{name:'游移',duration:1.23,x:[-.26,-.06,-.23,0],y:[.18,-.10,.02,0],scale:[.8,1.25,.87,1.46],flip:[0,145,25,180],tilt:[-14,22,-23,0]},
  '特殊':{name:'異相',duration:1.55,x:[-.26,-.04,.09,0],y:[.18,-.18,-.11,0],scale:[.81,1.19,1.55,1.46],flip:[0,165,290,540],tilt:[-14,-6,14,0]}
});
const DIRECTIONS=Object.freeze([0,90,-90,180]);
const GROUPS=Object.freeze(['靈魂','連結','生命','自然','礦物','元素','秩序','無序','特殊']);
const TIMING=Object.freeze([0,.28,.68,1]);

/** Respect the canonical eight groups of eight, plus rune 65/66. */
export function runeDrawGroup(rune){
  const id=Number(rune?.rune_id);
  if(Number.isInteger(id)&&id>=1&&id<=64)return GROUPS[Math.floor((id-1)/8)];
  if(id===65||id===66)return '特殊';
  const group=String(rune?.group_name||'');
  return Object.hasOwn(PATHS,group)?group:'特殊';
}

export function runeDrawMotion(group,directionIndex,{width=800,height=520}={},reduced=false){
  const path=PATHS[group]||PATHS['特殊'];
  const direction=DIRECTIONS[directionIndex]??0;
  if(reduced){
    return {
      name:path.name,
      initial:{opacity:0,x:0,y:0,scale:1,rotateY:180,rotateZ:direction},
      animate:{opacity:1,x:0,y:0,scale:1,rotateY:180,rotateZ:direction},
      transition:{duration:.05}
    };
  }
  const x=path.x.map(n=>Math.round(n*width));
  const y=path.y.map(n=>Math.round(n*height));
  const rotateZ=[...path.tilt.slice(0,-1),direction];
  return {
    name:path.name,
    initial:{opacity:0,x:x[0],y:y[0],scale:path.scale[0],rotateY:path.flip[0],rotateZ:rotateZ[0]},
    animate:{opacity:[0,1,1,1],x,y,scale:path.scale,rotateY:path.flip,rotateZ},
    transition:{duration:path.duration,times:TIMING,ease:'easeInOut'}
  };
}
